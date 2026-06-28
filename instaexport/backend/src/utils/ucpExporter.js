/**
 * UCP (Universal Conversation Package) Exporter
 * Spec: Universal Conversation Package v0.1
 * Exports Instagram comments as a .ucp file (ZIP container with JSON + assets)
 */

const JSZip = require('jszip');
const crypto = require('crypto');

function sha256(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

/**
 * Parse comment text into UCP content blocks
 * Handles: plain text, @mentions, #hashtags, emojis
 */
function parseContentBlocks(text) {
  if (!text) return [{ type: 'text', text: '' }];

  const blocks = [];
  const regex = /(@\w+|#\w+|(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})+)/gu;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      const t = text.slice(lastIndex, match.index);
      if (t) blocks.push({ type: 'text', text: t });
    }

    const part = match[0];
    if (part.startsWith('@')) {
      blocks.push({ type: 'mention', username: part.slice(1), text: part });
    } else if (part.startsWith('#')) {
      blocks.push({ type: 'hashtag', tag: part.slice(1), text: part });
    } else {
      blocks.push({ type: 'emoji', value: part });
    }

    lastIndex = regex.lastIndex;
  }

  // Remaining text
  if (lastIndex < text.length) {
    blocks.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return blocks.length > 0 ? blocks : [{ type: 'text', text: text }];
}

/**
 * Build complete UCP package from Instagram comments
 */
async function buildUCPPackage(comments, post, user, isUnlocked) {
  const zip = new JSZip();
  const now = new Date().toISOString();
  const packageId = `urn:commentexport:${post.id}:${Date.now()}`;

  // ── Participants ───────────────────────────
  const participantsMap = new Map();

  participantsMap.set(user.instagram_user_id, {
    id: `user_${user.instagram_user_id}`,
    display_name: user.username,
    username: user.username,
    role: 'owner',
    source: { platform: 'instagram', user_id: user.instagram_user_id },
  });

  comments.forEach(c => {
    const key = c.commenter_username || 'unknown';
    if (!participantsMap.has(key)) {
      participantsMap.set(key, {
        id: `user_${key}`,
        display_name: key,
        username: key,
        role: 'commenter',
        source: { platform: 'instagram', username: key },
      });
    }
  });

  const participants = { participants: Array.from(participantsMap.values()) };

  // ── Threads ────────────────────────────────
  const rootComments = comments.filter(c => !c.parent_id);
  const threads = [
    {
      id: 'thread_main',
      title: post.caption?.substring(0, 80) || 'Instagram Post',
      root_message_ids: rootComments.map(rc => `msg_${rc.id}`),
      source: {
        platform: 'instagram',
        media_id: post.instagram_media_id,
        permalink: post.permalink,
        comment_count: post.comment_count,
      },
    },
    ...rootComments.map(rc => ({
      id: `thread_${rc.id}`,
      title: rc.text?.substring(0, 50) || 'Thread',
      root_message_ids: [`msg_${rc.id}`],
    })),
  ];

  // ── Messages ───────────────────────────────
  const messages = comments.map(c => {
    const authorId = `user_${c.commenter_username || 'unknown'}`;
    const threadId = c.parent_id ? `thread_${c.parent_id}` : 'thread_main';
    const contentBlocks = parseContentBlocks(c.text);

    const reactionBlocks = c.like_count > 0 ? [{
      type: 'reaction',
      emoji: '❤️',
      count: c.like_count,
      by_owner: true,
    }] : [];

    return {
      id: `msg_${c.id}`,
      thread_id: threadId,
      parent_id: c.parent_id ? `msg_${c.parent_id}` : null,
      author_id: authorId,
      created_at: c.instagram_timestamp || now,
      deleted: false,
      visibility: 'visible',
      content: [...contentBlocks, ...reactionBlocks],
      source: {
        platform: 'instagram',
        comment_id: c.instagram_comment_id,
        depth: c.depth,
      },
      extensions: {
        'com.commentexport.instagram': {
          like_count: c.like_count || 0,
          depth: c.depth,
        },
      },
    };
  });

  const conversation = { threads, messages };

  // ── Reactions ──────────────────────────────
  const reactions = {
    reactions: comments
      .filter(c => c.like_count > 0)
      .map(c => ({
        id: `reaction_${c.id}`,
        message_id: `msg_${c.id}`,
        emoji: '❤️',
        count: c.like_count,
        by_owner: true,
        source: { platform: 'instagram' },
      })),
  };

  // ── Media ──────────────────────────────────
  const media = {
    items: [],
    note: 'Instagram stickers/GIFs/images require additional API permissions. Source URLs preserved in message source fields.',
  };

  // ── Metadata ───────────────────────────────
  const metadata = {
    source_platform: 'instagram',
    source_url: post.permalink || '',
    source_id: post.instagram_media_id,
    title: post.caption?.substring(0, 100) || 'Instagram Post',
    description: post.caption || '',
    locale: 'en',
    timezone: 'UTC',
    export_settings: {
      exporter: 'CommentExport',
      version: '1.0.0',
      free_limit: isUnlocked ? null : 500,
      total_comments: post.comment_count || comments.length,
      exported_comments: comments.length,
      is_complete: isUnlocked,
    },
    rights: {
      owner: user.username,
      platform: 'Instagram / Meta',
      note: 'Content owned by respective authors. Exported for archival purposes.',
    },
    archive_status: isUnlocked ? 'complete' : 'partial',
    created_at: now,
  };

  // ── Search index ───────────────────────────
  const searchIndex = comments.map(c => ({
    id: `msg_${c.id}`,
    text: c.text || '',
    author: c.commenter_username || '',
    ts: c.instagram_timestamp || '',
    depth: c.depth,
  }));

  // ── Serialize ──────────────────────────────
  const conversationStr = JSON.stringify(conversation, null, 2);
  const participantsStr = JSON.stringify(participants, null, 2);
  const mediaStr = JSON.stringify(media, null, 2);
  const reactionsStr = JSON.stringify(reactions, null, 2);
  const metadataStr = JSON.stringify(metadata, null, 2);
  const searchIndexStr = JSON.stringify(searchIndex, null, 2);

  // ── Manifest with hashes ───────────────────
  const entries = [
    { path: 'conversation.json', sha256: sha256(conversationStr) },
    { path: 'participants.json', sha256: sha256(participantsStr) },
    { path: 'media.json', sha256: sha256(mediaStr) },
    { path: 'reactions.json', sha256: sha256(reactionsStr) },
    { path: 'metadata.json', sha256: sha256(metadataStr) },
    { path: 'search.index', sha256: sha256(searchIndexStr) },
  ];

  const manifest = {
    ucp_version: '0.1',
    package_id: packageId,
    created_at: now,
    created_by: {
      name: 'CommentExport',
      version: '1.0.0',
      url: 'https://commentexport.vercel.app',
    },
    compression: 'deflate',
    entries,
    compatibility: {
      min_reader_version: '0.1',
      unknown_fields: 'ignore',
      unknown_blocks: 'preserve',
    },
  };

  const manifestStr = JSON.stringify(manifest, null, 2);

  // ── Themes & Layouts ───────────────────────
  const igTheme = {
    id: 'instagram-light',
    name: 'Instagram Light',
    colors: {
      background: '#FFFFFF',
      surface: '#FAFAFA',
      text_primary: '#262626',
      text_secondary: '#8E8E8E',
      accent: '#0095F6',
      like: '#ED4956',
      border: '#DBDBDB',
    },
    typography: {
      font_family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      size_base: 14,
      size_small: 12,
    },
  };

  const igLayout = {
    id: 'instagram-comments',
    name: 'Instagram Comments Layout',
    theme: 'instagram-light',
    message_renderer: 'threaded',
    show_avatars: true,
    show_timestamps: true,
    show_reactions: true,
    depth_indent_px: 44,
  };

  // ── Assemble ZIP ───────────────────────────
  zip.file('manifest.json', manifestStr);
  zip.file('conversation.json', conversationStr);
  zip.file('participants.json', participantsStr);
  zip.file('media.json', mediaStr);
  zip.file('reactions.json', reactionsStr);
  zip.file('metadata.json', metadataStr);
  zip.file('search.index', searchIndexStr);
  zip.folder('themes').file('instagram-light.json', JSON.stringify(igTheme, null, 2));
  zip.folder('layouts').file('instagram-comments.json', JSON.stringify(igLayout, null, 2));
  zip.folder('assets'); // empty — ready for future media
  zip.folder('exports'); // empty — ready for derived exports

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return buffer;
}

module.exports = { buildUCPPackage };

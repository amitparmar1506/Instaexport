'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { MessageCircle, Users, ArrowUpRight, Layers } from 'lucide-react';

interface Analytics {
  total_comments: number;
  total_replies: number;
  unique_commenters: number;
  reply_ratio: number;
  max_depth: number;
  depth_distribution: Record<string, number>;
  hourly_activity: { hour: number; comments: number }[];
  top_comments: { id: string; username: string; likes: number }[];
}

export default function AnalyticsPanel({ analytics }: { analytics: Analytics }) {
  const depthData = Object.entries(analytics.depth_distribution || {}).map(([depth, count]) => ({
    name: depth === '0' ? 'Root' : depth === '1' ? 'Reply' : `Depth ${depth}`,
    count,
  }));

  const hourlyData = (analytics.hourly_activity || []).map(h => ({
    hour: `${h.hour}:00`,
    comments: h.comments,
  }));

  const COLORS = ['#9333ea', '#a855f7', '#c084fc', '#e9d5ff'];

  return (
    <div className="card p-5 space-y-6 animate-fade-in">
      <h3 className="text-sm font-semibold text-gray-900">Engagement Analytics</h3>

      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total comments', value: analytics.total_comments?.toLocaleString(), icon: MessageCircle, color: 'text-purple-600' },
          { label: 'Replies', value: analytics.total_replies?.toLocaleString(), icon: ArrowUpRight, color: 'text-blue-600' },
          { label: 'Unique users', value: analytics.unique_commenters?.toLocaleString(), icon: Users, color: 'text-green-600' },
          { label: 'Reply ratio', value: `${(Number(analytics.reply_ratio) * 100).toFixed(1)}%`, icon: Layers, color: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-50 rounded-lg p-3">
            <div className={`${color} mb-1`}><Icon className="w-4 h-4" /></div>
            <div className="text-lg font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Depth distribution */}
      {depthData.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-3">Thread depth distribution</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={depthData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {depthData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Hourly activity */}
      {hourlyData.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-3">Comment activity by hour (UTC)</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={hourlyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="comments" fill="#c084fc" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

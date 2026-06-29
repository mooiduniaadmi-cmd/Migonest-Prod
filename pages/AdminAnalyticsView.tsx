import React, { useState, useEffect } from 'react';
import { supabase } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function AdminAnalyticsView() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            const { data, error } = await supabase.from('analytics_events').select('*').order('created_at', { ascending: false }).limit(1000);
            if (!error && data) {
                setEvents(data);
            }
            setLoading(false);
        };
        fetchEvents();
    }, []);

    if (loading) return <div className="p-10 text-center">Loading Analytics...</div>;

    const eventCounts = events.reduce((acc, curr) => {
        acc[curr.event_name] = (acc[curr.event_name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.keys(eventCounts).map(key => ({
        name: key,
        count: eventCounts[key]
    }));

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-black mb-8">Analytics Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow">
                    <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider">Total Events</h3>
                    <p className="text-4xl font-black mt-2">{events.length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow">
                    <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider">Signups Started</h3>
                    <p className="text-4xl font-black mt-2">{eventCounts['SIGNUP_CLICK'] || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow">
                    <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider">Signups Completed</h3>
                    <p className="text-4xl font-black mt-2">{eventCounts['SIGNUP_COMPLETE'] || 0}</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow mb-8 h-96">
                <h3 className="font-bold mb-4">Event Frequency</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <XAxis dataKey="name" fontSize={10} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#4f46e5" radius={[4,4,0,0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow overflow-hidden">
                <h3 className="font-bold mb-4">Recent Events</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead>
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-900">Time</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-900">Event</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-900">Location</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-900">Device</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {events.slice(0, 50).map(e => (
                                <tr key={e.id}>
                                    <td className="px-4 py-3 text-gray-500">{new Date(e.created_at).toLocaleString()}</td>
                                    <td className="px-4 py-3 font-medium text-brand-600">{e.event_name}</td>
                                    <td className="px-4 py-3 text-gray-500">{e.city ? `${e.city}, ${e.country}` : e.country || 'Unknown'}</td>
                                    <td className="px-4 py-3 text-gray-500">{e.device_type} - {e.browser}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

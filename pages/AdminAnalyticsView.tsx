import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function AdminAnalyticsView() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [displayCount, setDisplayCount] = useState(20);
    const observer = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        const fetchEvents = async () => {
            // Fetching a large batch to compute accurate charts while paginating locally
            const { data, error } = await supabase.from('analytics_events').select('*').order('created_at', { ascending: false }).limit(2000);
            if (!error && data) {
                setEvents(data);
            }
            setLoading(false);
        };
        fetchEvents();
    }, []);

    const filteredEvents = events.filter(e => 
        e.event_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const displayedEvents = filteredEvents.slice(0, displayCount);

    const lastElementRef = useCallback((node: HTMLTableRowElement | null) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && displayCount < filteredEvents.length) {
                setDisplayCount(prev => prev + 20);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, displayCount, filteredEvents.length]);

    if (loading) return <div className="p-10 text-center">Loading Analytics...</div>;

    const eventCounts = filteredEvents.reduce((acc, curr) => {
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
                    <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider">Total Filtered</h3>
                    <p className="text-4xl font-black mt-2">{filteredEvents.length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow">
                    <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider">Hire Clicks</h3>
                    <p className="text-4xl font-black mt-2">{eventCounts['HIRE_EXPERT_CLICK'] || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow">
                    <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider">Expert Signups</h3>
                    <p className="text-4xl font-black mt-2">{eventCounts['EXPERT_SIGNUP_CLICK'] || 0}</p>
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h3 className="font-bold text-lg">Event Log</h3>
                    <input 
                        type="text" 
                        placeholder="Search by event name..." 
                        className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 w-full sm:w-64 outline-none"
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setDisplayCount(20); }}
                    />
                </div>
                
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
                            {displayedEvents.map((e, index) => {
                                const isLast = index === displayedEvents.length - 1;
                                return (
                                    <tr key={e.id} ref={isLast ? lastElementRef : null}>
                                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                                        <td className="px-4 py-3 font-medium text-brand-600 whitespace-nowrap">{e.event_name}</td>
                                        <td className="px-4 py-3 text-gray-500">{e.city ? `${e.city}, ${e.country}` : e.country || 'Unknown'}</td>
                                        <td className="px-4 py-3 text-gray-500">{e.device_type} - {e.browser}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    {displayCount < filteredEvents.length && (
                        <div className="text-center py-6">
                            <button 
                                onClick={() => setDisplayCount(prev => prev + 20)}
                                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                            >
                                Load More
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

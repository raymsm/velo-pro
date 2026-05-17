import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RideRecord } from '../types';
import { formatDistance, formatDuration, formatCurrency } from '../lib/utils';
import { RideService } from '../rideService';
import { Fuel, Route, TrendingUp, Wallet, Sparkles } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';

interface DashboardProps {
  rides: RideRecord[];
  currency?: string;
  odometer?: number;
}

export default function Dashboard({ rides, currency = 'USD', odometer = 0 }: DashboardProps) {
  const stats = RideService.getStats(rides);
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  useEffect(() => {
    if (rides.length >= 2 && insights.length === 0) {
      setLoadingInsights(true);
      fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rides: rides.slice(-5) })
      })
      .then(res => res.json())
      .then(data => {
        if (data.insights) setInsights(data.insights);
      })
      .finally(() => setLoadingInsights(false));
    }
  }, [rides]);

  const chartData = rides.slice(-7).map(r => ({
    date: new Date(r.startTime).toLocaleDateString(undefined, { weekday: 'short' }),
    distance: r.distance,
    cost: r.fuelCost
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <StatCard 
            title="Life_Odometer" 
            value={formatDistance(odometer)} 
            icon={<Route className="w-4 h-4 text-primary" />} 
            subtitle="Vehicle Total"
            isAccent
            animate={true}
        />
        <StatCard 
            title="Total Distance" 
            value={formatDistance(stats.totalDistance)} 
            icon={<Route className="w-4 h-4" />} 
            subtitle="App Tracked"
        />
        <StatCard 
            title="Avg Economy" 
            value={`${stats.avgEconomy.toFixed(1)} km/L`} 
            icon={<TrendingUp className="w-4 h-4" />} 
            subtitle="Efficiency"
            isAccent
        />
        <StatCard 
            title="Total Cost" 
            value={formatCurrency(stats.totalCost, currency)} 
            icon={<Wallet className="w-4 h-4" />} 
            subtitle="Expenses"
        />
        <StatCard 
            title="Fuel Used" 
            value={`${stats.totalFuel.toFixed(1)} L`} 
            icon={<Fuel className="w-4 h-4" />} 
            subtitle="Consumption"
        />
      </div>

      {insights.length > 0 && (
          <Card className="bg-primary/5 border-primary/20 overflow-hidden relative group rounded-sm">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="w-16 h-16 text-primary" />
            </div>
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">VELOTRAX__INSIGHTS</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {insights.map((insight, i) => (
                    <div key={i} className="flex gap-3 items-start">
                        <Badge className="mt-0.5 bg-primary text-black font-mono text-[9px] h-3.5 px-1 rounded-sm">0{i+1}</Badge>
                        <p className="text-xs font-medium leading-tight text-gray-300 tracking-tight">{insight}</p>
                    </div>
                ))}
            </CardContent>
          </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-[#121417] border-[#2A2D33] rounded-sm">
          <CardHeader className="p-4 border-b border-[#2A2D33]/30 mb-2">
            <CardTitle className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Historical Distance [7_SESSION_LOG]</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] p-4 pt-2">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D33" vertical={false} />
                    <XAxis dataKey="date" stroke="#666" fontSize={9} axisLine={false} tickLine={false} />
                    <YAxis stroke="#666" fontSize={9} axisLine={false} tickLine={false} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#121417', border: '1px solid #2A2D33', borderRadius: '4px', fontSize: '10px' }}
                        itemStyle={{ color: '#C8FF00' }}
                    />
                    <Bar dataKey="distance" fill="#C8FF00" radius={[2, 2, 0, 0]} barSize={20} />
                </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-[#121417] border-[#2A2D33] rounded-sm">
          <CardHeader className="p-4 border-b border-[#2A2D33]/30 mb-2">
            <CardTitle className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Economy Matrix [FUEL_EVAL]</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] p-4 pt-2">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D33" vertical={false} />
                    <XAxis dataKey="date" stroke="#666" fontSize={9} axisLine={false} tickLine={false} />
                    <YAxis stroke="#666" fontSize={9} axisLine={false} tickLine={false} />
                    <Tooltip 
                         contentStyle={{ backgroundColor: '#121417', border: '1px solid #2A2D33', borderRadius: '4px', fontSize: '10px' }}
                         itemStyle={{ color: '#C8FF00' }}
                    />
                    <Line type="monotone" dataKey="cost" stroke="#C8FF00" strokeWidth={2} dot={{ r: 3, fill: '#C8FF00' }} activeDot={{ r: 5 }} />
                </LineChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, subtitle, isAccent, animate }: { title: string, value: string, icon: React.ReactNode, subtitle: string, isAccent?: boolean, animate?: boolean }) {
    return (
        <Card className={`bg-[#16181D] border-[#22252B] transition-all duration-500 rounded-sm overflow-hidden flex flex-col relative ${isAccent ? 'hover:border-primary/50' : 'hover:border-[#2A2D33]'}`}>
            <CardContent className="p-3 flex flex-col gap-1">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{title}</span>
                    <div className={isAccent ? "text-primary" : "text-gray-600"}>{icon}</div>
                </div>
                <motion.div 
                    key={value}
                    initial={animate ? { y: 10, opacity: 0 } : false}
                    animate={{ y: 0, opacity: 1 }}
                    className={`text-xl font-mono tracking-tighter ${isAccent ? 'text-primary' : 'text-white'}`}
                >
                  {value}
                </motion.div>
            </CardContent>
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#2A2D33] to-transparent opacity-50" />
            {isAccent && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -translate-y-12 translate-x-12 pointer-events-none" />
            )}
        </Card>
    );
}

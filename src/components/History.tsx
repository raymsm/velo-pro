import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RideRecord } from '../types';
import { formatDistance, formatDuration, formatCurrency } from '../lib/utils';
import { Calendar, ChevronRight, Hash, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HistoryProps {
  rides: RideRecord[];
  currency?: string;
}

export default function History({ rides, currency = 'USD' }: HistoryProps) {
  const sortedRides = [...rides].sort((a, b) => b.startTime - a.startTime);

  return (
    <Card className="border-[#2A2D33] bg-[#0D0F12] rounded-sm overflow-hidden">
      <ScrollArea className="h-[calc(100vh-280px)]">
        <Table className="font-mono text-[11px]">
          <TableHeader className="bg-[#121417] border-b border-[#2A2D33]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-normal text-gray-500 uppercase py-3">DATE</TableHead>
              <TableHead className="font-normal text-gray-500 uppercase py-3">DIST</TableHead>
              <TableHead className="font-normal text-gray-500 uppercase py-3">COST</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#2A2D33]/30">
            {sortedRides.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-gray-600 italic">
                  NO_RECORDS_FOUND
                </TableCell>
              </TableRow>
            ) : (
              sortedRides.map((ride) => (
                <TableRow key={ride.id} className="hover:bg-[#16181D] border-none transition-colors cursor-pointer group">
                  <TableCell className="py-3 text-white uppercase">
                    {new Date(ride.startTime).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                  </TableCell>
                  <TableCell className="text-white">
                    {ride.distance.toFixed(1)}km
                  </TableCell>
                  <TableCell className="text-white">
                    {ride.fuelCost > 0 ? formatCurrency(ride.fuelCost, currency) : '---'}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-primary transition-colors" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  );
}

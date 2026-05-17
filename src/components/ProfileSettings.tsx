import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { User, Bike, ShieldAlert, Download, Upload, MessageCircle, Settings2, Globe, Moon, Sun, Monitor } from 'lucide-react';
import { RiderDetails, VehicleProfile, UserSettings, Currency } from '../types';
import { RideService } from '../rideService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProfileSettingsProps {
  onUpdate: () => void;
}

export default function ProfileSettings({ onUpdate }: ProfileSettingsProps) {
  const [rider, setRider] = useState<RiderDetails>({
    name: '', bloodGroup: '', medication: '', notes: '', insurance: '',
    emergencyContact: { name: '', phone: '' }
  });
  const [vehicle, setVehicle] = useState<VehicleProfile>({
    make: '', model: '', year: new Date().getFullYear(), fuelCapacity: 0, averageEconomy: 0, currentOdometer: 0
  });
  const [settings, setSettings] = useState<UserSettings>({
    currency: 'USD', theme: 'system', aiProvider: 'gemini'
  });

  useEffect(() => {
    RideService.getProfile().then(data => {
      if (data) {
        if (data.rider) setRider(data.rider);
        if (data.vehicle) setVehicle(data.vehicle);
        if (data.settings) setSettings(data.settings);
      }
    });
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (settings.theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(settings.theme);
    }
  }, [settings.theme]);

  const saveAll = async () => {
    await RideService.updateProfile({ rider, vehicle, settings });
    onUpdate();
  };

  const currencies: Currency[] = ['USD', 'INR', 'GBP', 'EUR', 'CUSTOM'];

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-6 pb-20">
        {/* Rider Info */}
        <Card className="bg-[#121417] border-[#2A2D33] rounded-sm">
          <CardHeader className="p-4 border-b border-[#2A2D33]/30">
            <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2">
              <User className="w-3 h-3" /> User_Intel
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-gray-500 font-mono">Codename</Label>
                <Input value={rider.name} onChange={e => setRider({...rider, name: e.target.value})} className="h-8 text-xs font-mono bg-black/40 border-[#2A2D33]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-gray-500 font-mono">Blood_Type</Label>
                <Input value={rider.bloodGroup} onChange={e => setRider({...rider, bloodGroup: e.target.value})} className="h-8 text-xs font-mono bg-black/40 border-[#2A2D33]" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] uppercase text-gray-500 font-mono">Medical_Notes</Label>
              <Input value={rider.notes} onChange={e => setRider({...rider, notes: e.target.value})} className="h-8 text-xs font-mono bg-black/40 border-[#2A2D33]" />
            </div>
            <div className="border-t border-[#2A2D33]/30 pt-4">
                <Label className="text-[9px] font-bold text-red-500 uppercase tracking-widest block mb-2">Emergency_Contact</Label>
                <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Name" value={rider.emergencyContact.name} onChange={e => setRider({...rider, emergencyContact: {...rider.emergencyContact, name: e.target.value}})} className="h-8 text-xs font-mono bg-black/40 border-[#2A2D33]" />
                    <Input placeholder="Phone" value={rider.emergencyContact.phone} onChange={e => setRider({...rider, emergencyContact: {...rider.emergencyContact, phone: e.target.value}})} className="h-8 text-xs font-mono bg-black/40 border-[#2A2D33]" />
                </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Info */}
        <Card className="bg-[#121417] border-[#2A2D33] rounded-sm">
          <CardHeader className="p-4 border-b border-[#2A2D33]/30">
            <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2">
              <Bike className="w-3 h-3" /> Machine_Specs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-gray-500 font-mono">Make</Label>
                <Input value={vehicle.make} onChange={e => setVehicle({...vehicle, make: e.target.value})} className="h-8 text-xs font-mono bg-black/40 border-[#2A2D33]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-gray-500 font-mono">Model</Label>
                <Input value={vehicle.model} onChange={e => setVehicle({...vehicle, model: e.target.value})} className="h-8 text-xs font-mono bg-black/40 border-[#2A2D33]" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                    <Label className="text-[9px] uppercase text-gray-500 font-mono">Year</Label>
                    <Input type="number" value={vehicle.year} onChange={e => setVehicle({...vehicle, year: parseInt(e.target.value)})} className="h-8 text-xs font-mono bg-black/40 border-[#2A2D33]" />
                </div>
                <div className="space-y-1">
                    <Label className="text-[9px] uppercase text-gray-500 font-mono">Fuel (L)</Label>
                    <Input type="number" value={vehicle.fuelCapacity} onChange={e => setVehicle({...vehicle, fuelCapacity: parseFloat(e.target.value)})} className="h-8 text-xs font-mono bg-black/40 border-[#2A2D33]" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label className="text-[9px] uppercase text-gray-500 font-mono">Current Odometer (km)</Label>
                    <Input type="number" value={vehicle.currentOdometer} onChange={e => setVehicle({...vehicle, currentOdometer: parseFloat(e.target.value)})} className="h-8 text-xs font-mono bg-black/40 border-[#2A2D33]" />
                </div>
                <div className="space-y-1">
                    <Label className="text-[9px] uppercase text-gray-500 font-mono">Avg km/L</Label>
                    <Input type="number" value={vehicle.averageEconomy} onChange={e => setVehicle({...vehicle, averageEconomy: parseFloat(e.target.value)})} className="h-8 text-xs font-mono bg-black/40 border-[#2A2D33]" />
                </div>
            </div>
          </CardContent>
        </Card>

        {/* Global Settings */}
        <Card className="bg-[#121417] border-[#2A2D33] rounded-sm">
          <CardHeader className="p-4 border-b border-[#2A2D33]/30">
            <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2">
              <Settings2 className="w-3 h-3" /> System_Config
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-[9px] uppercase text-gray-500 font-mono">Base_Currency</Label>
                <div className="flex gap-1 overflow-x-auto pb-1 max-w-[200px]">
                    {currencies.map(c => (
                        <Button 
                            key={c} 
                            variant={settings.currency === c ? 'default' : 'outline'}
                            size="sm"
                            className="h-6 px-2 text-[9px] font-mono border-[#2A2D33]"
                            onClick={() => setSettings({...settings, currency: c})}
                        >
                            {c}
                        </Button>
                    ))}
                </div>
            </div>
            <div className="flex items-center justify-between">
                <Label className="text-[9px] uppercase text-gray-500 font-mono">Visual_Mode</Label>
                <div className="flex gap-2">
                    <Button variant={settings.theme === 'light' ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0 border-[#2A2D33]" onClick={() => setSettings({...settings, theme: 'light'})}><Sun className="w-4 h-4" /></Button>
                    <Button variant={settings.theme === 'dark' ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0 border-[#2A2D33]" onClick={() => setSettings({...settings, theme: 'dark'})}><Moon className="w-4 h-4" /></Button>
                    <Button variant={settings.theme === 'system' ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0 border-[#2A2D33]" onClick={() => setSettings({...settings, theme: 'system'})}><Monitor className="w-4 h-4" /></Button>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <div className="grid grid-cols-2 gap-2">
             <Button variant="outline" className="border-[#2A2D33] text-[9px] font-bold uppercase tracking-widest h-10" onClick={() => RideService.exportData([])}>
                <Download className="w-3 h-3 mr-2" /> Backup_Intel
             </Button>
             <label className="border-[#2A2D33] border rounded-md text-[9px] font-bold uppercase tracking-widest h-10 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                <Upload className="w-3 h-3 mr-2" /> Restore_Data
                <input type="file" className="hidden" accept=".json" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            try {
                                const data = JSON.parse(ev.target?.result as string);
                                console.log('Imported:', data);
                                // Logic to save imported rides
                            } catch (err) { console.error('Import failed'); }
                        }
                        reader.readAsText(file);
                    }
                }} />
             </label>
        </div>

        <Button onClick={saveAll} className="w-full h-12 bg-primary text-black font-bold uppercase tracking-[0.2em] shadow-lg">
            Commit_Changes
        </Button>
      </div>
    </ScrollArea>
  );
}

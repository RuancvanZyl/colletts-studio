import { useState } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { mockHuntStatistics, animalsBySpecies, huntsByMonth } from '../mockOutfitterData';
import { Download, TrendingUp, MapPin, Trophy, Users } from 'lucide-react';

const COLORS = ['#15803d', '#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7'];

export function AnimalSummary() {
  const [selectedYear, setSelectedYear] = useState('2024');

  const handleExportReport = () => {
    // Mock export functionality
    alert('Exporting annual report...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 mb-2">Annual Summary</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Overview of your hunting operations and statistics
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportReport} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/50 dark:to-lime-950/50 border-green-300 dark:border-green-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-stone-600 dark:text-stone-400 text-sm">Animals Harvested</div>
              <div className="text-green-800 dark:text-green-400">
                {mockHuntStatistics.totalAnimalsHarvested}
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-950/50 dark:to-green-950/50 border-lime-300 dark:border-lime-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-lime-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-stone-600 dark:text-stone-400 text-sm">Most Common</div>
              <div className="text-lime-800 dark:text-lime-400">
                {mockHuntStatistics.mostCommonSpecies}
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-900/50 dark:to-emerald-950/50 border-green-400 dark:border-green-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-stone-600 dark:text-stone-400 text-sm">Top Location</div>
              <div className="text-green-900 dark:text-green-300 text-sm">
                {mockHuntStatistics.topHuntingLocation}
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-emerald-300 dark:border-emerald-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-stone-600 dark:text-stone-400 text-sm">Hunters Guided</div>
              <div className="text-emerald-800 dark:text-emerald-400">
                {mockHuntStatistics.totalHuntersGuided}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Animals by Species */}
        <Card className="p-6">
          <h3 className="text-slate-900 dark:text-slate-100 mb-4">Animals by Species</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={animalsBySpecies}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="species" 
                angle={-45}
                textAnchor="end"
                height={100}
                style={{ fontSize: '12px' }}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie Chart - Species Distribution */}
        <Card className="p-6">
          <h3 className="text-slate-900 dark:text-slate-100 mb-4">Species Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={animalsBySpecies.slice(0, 7)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ species, percent }) => `${species} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {animalsBySpecies.slice(0, 7).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Hunts Per Month Chart */}
      <Card className="p-6">
        <h3 className="text-slate-900 dark:text-slate-100 mb-4">Hunts Per Month ({selectedYear})</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={huntsByMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="hunts" fill="#15803d" name="Number of Hunts" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Location Map Placeholder */}
      <Card className="p-6">
        <h3 className="text-slate-900 dark:text-slate-100 mb-4">Hunting Locations</h3>
        <div className="bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/30 dark:to-lime-950/30 rounded-lg p-12 text-center border-2 border-dashed border-green-300 dark:border-green-800">
          <MapPin className="w-12 h-12 mx-auto mb-3 text-green-600 dark:text-green-500" />
          <p className="text-slate-600 dark:text-slate-400">
            Interactive map showing hunting locations and heatmap data
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
            Map integration coming soon
          </p>
        </div>
      </Card>
    </div>
  );
}

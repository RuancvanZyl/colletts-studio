import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { huntsByMonth, huntersByVolume, mockHuntStatistics } from '../mockOutfitterData';
import { Download, TrendingUp, MapPin, Target, Award } from 'lucide-react';

export function PerformanceAnalytics() {
  const handleExportReport = (format: 'pdf' | 'excel') => {
    alert(`Exporting report as ${format.toUpperCase()}...`);
  };

  const avgAnimalsPerHunter = (
    mockHuntStatistics.totalAnimalsHarvested / mockHuntStatistics.totalHuntersGuided
  ).toFixed(1);

  const avgHuntsPerMonth = (mockHuntStatistics.totalHuntsThisYear / 12).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 mb-2">Insights & Reports</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Detailed analytics and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleExportReport('pdf')} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
          <Button onClick={() => handleExportReport('excel')} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/50 dark:to-lime-950/50 border-green-300 dark:border-green-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-stone-600 dark:text-stone-400 text-sm">Most Popular Farm</div>
              <div className="text-green-800 dark:text-green-400 text-sm">
                Kalahari Reserve
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-950/50 dark:to-green-950/50 border-lime-300 dark:border-lime-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-lime-600 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-stone-600 dark:text-stone-400 text-sm">Most Common Species</div>
              <div className="text-lime-800 dark:text-lime-400 text-sm">
                {mockHuntStatistics.mostCommonSpecies}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-900/50 dark:to-emerald-950/50 border-green-400 dark:border-green-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-stone-600 dark:text-stone-400 text-sm">Avg Animals/Hunter</div>
              <div className="text-green-900 dark:text-green-300">
                {avgAnimalsPerHunter}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-emerald-300 dark:border-emerald-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-stone-600 dark:text-stone-400 text-sm">Avg Hunts/Month</div>
              <div className="text-emerald-800 dark:text-emerald-400">
                {avgHuntsPerMonth}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Line Chart - Hunts per Month */}
      <Card className="p-6">
        <h3 className="text-slate-900 dark:text-slate-100 mb-4">Hunts per Month (2024)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={huntsByMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="hunts"
              stroke="#15803d"
              strokeWidth={2}
              name="Number of Hunts"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Bar Chart - Hunters by Volume */}
      <Card className="p-6">
        <h3 className="text-slate-900 dark:text-slate-100 mb-4">Top Hunters by Volume</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={huntersByVolume} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" />
            <YAxis dataKey="hunter" type="category" width={120} />
            <Tooltip />
            <Legend />
            <Bar dataKey="hunts" fill="#16a34a" name="Total Hunts" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Summary Report */}
      <Card className="p-6 bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/30 dark:to-lime-950/30 border-green-300 dark:border-green-800">
        <h3 className="text-slate-900 dark:text-slate-100 mb-4">Annual Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-slate-700 dark:text-slate-300 mb-3">Key Achievements</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Successfully guided {mockHuntStatistics.totalHuntersGuided} hunters this year</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Facilitated harvest of {mockHuntStatistics.totalAnimalsHarvested} animals across {mockHuntStatistics.totalHuntsThisYear} hunts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Maintained 100% compliance with licensing requirements</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Peak season in May with 4 hunts completed</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-slate-700 dark:text-slate-300 mb-3">Areas of Focus</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-amber-600">•</span>
                <span>Increase activity during October-December period</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600">•</span>
                <span>Diversify species offerings to attract broader clientele</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600">•</span>
                <span>Expand to additional hunting locations</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Package, Truck, Scan, CheckCircle2, Upload, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export function PackingShipping() {
  const [activeTab, setActiveTab] = useState('packing');
  const [scanInput, setScanInput] = useState('');
  const [packingData, setPackingData] = useState<any>(null);
  const [shippingInfo, setShippingInfo] = useState({
    courier: '',
    trackingNumber: '',
    gpsTag: ''
  });

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    
    setPackingData({
      trophyId: scanInput,
      species: 'Kudu',
      huntId: 'HUNT-2025-004',
      parts: [
        { id: 'MOUNT-001', type: 'Shoulder Mount', status: 'completed' }
      ],
      allStagesCompleted: true,
      documentsUploaded: true
    });
    
    toast.success(`Trophy ${scanInput} loaded for packing`);
    setScanInput('');
  };

  const handleMarkPacked = () => {
    if (!packingData) return;
    
    toast.success('Trophy marked as packed. Ready for shipping.');
    setActiveTab('shipping');
  };

  const handleMarkShipped = () => {
    if (!shippingInfo.courier || !shippingInfo.trackingNumber) {
      toast.error('Please fill in courier and tracking information');
      return;
    }

    toast.success('Trophy marked as shipped! Notifications sent to Hunter and Outfitter.');
    setPackingData(null);
    setShippingInfo({
      courier: '',
      trackingNumber: '',
      gpsTag: ''
    });
    setActiveTab('packing');
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-slate-900 dark:text-slate-100">Packing & Shipping</h1>
        <p className="text-slate-600 dark:text-slate-400">Prepare and ship completed trophies</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="packing">
            <Package className="w-4 h-4 mr-2" />
            Packing
          </TabsTrigger>
          <TabsTrigger value="shipping">
            <Truck className="w-4 h-4 mr-2" />
            Shipping
          </TabsTrigger>
        </TabsList>

        {/* PACKING TAB */}
        <TabsContent value="packing" className="space-y-6">
          {/* Scan Area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="w-5 h-5 text-blue-600" />
                Scan Trophy for Packing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleScan} className="flex gap-3">
                <Input
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Scan or enter trophy ID..."
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit">
                  <Scan className="w-4 h-4 mr-2" />
                  Load
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Packing Details */}
          {packingData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Packing List: {packingData.trophyId}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Trophy Info */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Species</p>
                    <p className="text-sm text-slate-900 dark:text-slate-100">{packingData.species}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Trophy ID</p>
                    <p className="text-sm font-mono text-slate-900 dark:text-slate-100">{packingData.trophyId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Hunt ID</p>
                    <p className="text-sm font-mono text-slate-900 dark:text-slate-100">{packingData.huntId}</p>
                  </div>
                </div>

                {/* Verification Status */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">System Verification</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                      <span className="text-sm text-slate-900 dark:text-slate-100">All parts present</span>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                      <span className="text-sm text-slate-900 dark:text-slate-100">All stages completed</span>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                      <span className="text-sm text-slate-900 dark:text-slate-100">Export documents uploaded</span>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* Packing Details */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Box Size</Label>
                    <Select defaultValue="large">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (60x40x40cm)</SelectItem>
                        <SelectItem value="medium">Medium (100x60x60cm)</SelectItem>
                        <SelectItem value="large">Large (150x80x80cm)</SelectItem>
                        <SelectItem value="custom">Custom Size</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <Input type="number" placeholder="25.5" />
                  </div>

                  <div className="space-y-2">
                    <Label>Declared Value ($)</Label>
                    <Input type="number" placeholder="5000" />
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={handleMarkPacked}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Mark as Packed
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setPackingData(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SHIPPING TAB */}
        <TabsContent value="shipping" className="space-y-6">
          {packingData ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  Shipping Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Trophy Info */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Trophy ID</p>
                      <p className="text-sm font-mono text-slate-900 dark:text-slate-100">{packingData.trophyId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Species</p>
                      <p className="text-sm text-slate-900 dark:text-slate-100">{packingData.species}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                      <Badge className="bg-green-600">Packed</Badge>
                    </div>
                  </div>
                </div>

                {/* Shipping Details Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Courier Service *</Label>
                    <Select 
                      value={shippingInfo.courier}
                      onValueChange={(value) => setShippingInfo({...shippingInfo, courier: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select courier..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dhl">DHL Express</SelectItem>
                        <SelectItem value="fedex">FedEx International</SelectItem>
                        <SelectItem value="ups">UPS Worldwide</SelectItem>
                        <SelectItem value="local">Local Courier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tracking Number *</Label>
                    <Input
                      value={shippingInfo.trackingNumber}
                      onChange={(e) => setShippingInfo({...shippingInfo, trackingNumber: e.target.value})}
                      placeholder="Enter tracking number"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>GPS Tag ID (Optional)</Label>
                    <Input
                      value={shippingInfo.gpsTag}
                      onChange={(e) => setShippingInfo({...shippingInfo, gpsTag: e.target.value})}
                      placeholder="Optional GPS tracking tag"
                    />
                  </div>
                </div>

                {/* Upload Shipping Documents */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Label>Shipping Documents</Label>
                  <div className="mt-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center hover:border-slate-400 dark:hover:border-slate-600 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Upload waybill, customs forms, insurance
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={handleMarkShipped}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Mark as Shipped
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setActiveTab('packing')}
                  >
                    Back to Packing
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                    <Truck className="w-8 h-8 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-slate-900 dark:text-slate-100">No trophy ready for shipping</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Pack a trophy first from the Packing tab</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

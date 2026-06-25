import { useState } from 'react';
import { mockOutfitter } from '../mockOutfitterData';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { Edit2, Save, X, LogOut, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface OutfitterProfileProps {
  onLogout: () => void;
}

export function OutfitterProfile({ onLogout }: OutfitterProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: mockOutfitter.fullName,
    company: mockOutfitter.company,
    email: mockOutfitter.email,
    phone: mockOutfitter.phone,
    country: mockOutfitter.country,
    province: mockOutfitter.province,
    city: mockOutfitter.city,
    farmName: mockOutfitter.farmName,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    toast.success('Profile updated successfully!');
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      fullName: mockOutfitter.fullName,
      company: mockOutfitter.company,
      email: mockOutfitter.email,
      phone: mockOutfitter.phone,
      country: mockOutfitter.country,
      province: mockOutfitter.province,
      city: mockOutfitter.city,
      farmName: mockOutfitter.farmName,
    });
    setIsEditing(false);
  };

  const getStatusInfo = () => {
    switch (mockOutfitter.status) {
      case 'approved':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          badge: <Badge className="bg-green-600">Verified Outfitter</Badge>,
          message: 'Your account is fully verified and approved',
        };
      case 'pending-review':
        return {
          icon: <Clock className="w-5 h-5 text-amber-600" />,
          badge: <Badge className="bg-amber-600">Pending Review</Badge>,
          message: 'Your account is under review by our team',
        };
      case 'expired':
        return {
          icon: <XCircle className="w-5 h-5 text-red-600" />,
          badge: <Badge variant="destructive">Expired</Badge>,
          message: 'Your licence has expired. Please renew your documents.',
        };
      default:
        return {
          icon: <Clock className="w-5 h-5" />,
          badge: <Badge variant="secondary">Unknown</Badge>,
          message: '',
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 mb-2">Profile</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your outfitter profile and account settings
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="gap-2">
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} className="gap-2">
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Profile Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
          <Avatar className="w-24 h-24">
            <AvatarFallback className="bg-gradient-to-br from-green-700 via-green-600 to-lime-600 text-white text-2xl">
              {mockOutfitter.fullName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-slate-900 dark:text-slate-100 mb-2">{mockOutfitter.fullName}</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-3">{mockOutfitter.company}</p>
            <div className="flex items-center gap-3">
              {statusInfo.icon}
              {statusInfo.badge}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {statusInfo.message}
            </p>
          </div>
        </div>

        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-slate-900 dark:text-slate-100 mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                disabled={!isEditing}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                disabled={!isEditing}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={!isEditing}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={!isEditing}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-4 mt-6 pt-6 border-t border-stone-200 dark:border-stone-700">
          <h3 className="text-slate-900 dark:text-slate-100 mb-4">Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                disabled={!isEditing}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="province">Province</Label>
              <Input
                id="province"
                value={formData.province}
                onChange={(e) => handleInputChange('province', e.target.value)}
                disabled={!isEditing}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                disabled={!isEditing}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="farmName">Farm / Business Name</Label>
              <Input
                id="farmName"
                value={formData.farmName}
                onChange={(e) => handleInputChange('farmName', e.target.value)}
                disabled={!isEditing}
                className="mt-2"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Document Status Summary */}
      <Card className="p-6">
        <h3 className="text-slate-900 dark:text-slate-100 mb-4">Document Status Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-green-800 dark:text-green-400 mb-1">
              {mockOutfitter.documents.filter(d => d.status === 'valid').length}
            </div>
            <div className="text-xs text-stone-600 dark:text-stone-400">Valid</div>
          </div>
          <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="text-amber-800 dark:text-amber-400 mb-1">
              {mockOutfitter.documents.filter(d => d.status === 'expiring-soon').length}
            </div>
            <div className="text-xs text-stone-600 dark:text-stone-400">Expiring Soon</div>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
            <div className="text-red-800 dark:text-red-400 mb-1">
              {mockOutfitter.documents.filter(d => d.status === 'expired').length}
            </div>
            <div className="text-xs text-stone-600 dark:text-stone-400">Expired</div>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-blue-800 dark:text-blue-400 mb-1">
              {mockOutfitter.documents.filter(d => d.status === 'pending').length}
            </div>
            <div className="text-xs text-stone-600 dark:text-stone-400">Pending</div>
          </div>
        </div>
      </Card>

      {/* Account Information */}
      <Card className="p-6">
        <h3 className="text-slate-900 dark:text-slate-100 mb-4">Account Information</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Outfitter ID:</span>
            <span className="text-slate-900 dark:text-slate-100">{mockOutfitter.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Registered:</span>
            <span className="text-slate-900 dark:text-slate-100">
              {new Date(mockOutfitter.registeredDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Last Active:</span>
            <span className="text-slate-900 dark:text-slate-100">
              {new Date(mockOutfitter.lastActive).toLocaleDateString()}
            </span>
          </div>
        </div>
      </Card>

      {/* Logout */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-slate-900 dark:text-slate-100 mb-1">Sign Out</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Sign out of your outfitter account
            </p>
          </div>
          <Button variant="destructive" onClick={onLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </Card>
    </div>
  );
}

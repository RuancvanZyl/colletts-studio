import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Separator } from '../../ui/separator';
import { User, Mail, Phone, Bell, LogOut } from 'lucide-react';

interface HunterProfileProps {
  onLogout: () => void;
}

export function HunterProfile({ onLogout }: HunterProfileProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-stone-900 dark:text-white mb-2">Profile</h1>
        <p className="text-stone-600 dark:text-stone-400">Manage your account settings</p>
      </div>

      {/* Profile Info */}
      <Card className="p-6 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-700 via-green-600 to-lime-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <User className="w-10 h-10 text-amber-50" />
          </div>
          <div className="flex-1">
            <h2 className="text-stone-900 dark:text-white mb-1">John Hunter</h2>
            <p className="text-stone-600 dark:text-stone-400">Client since Oct 2024</p>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-stone-400" />
            <div>
              <div className="text-stone-600 dark:text-stone-400">Email</div>
              <div className="text-stone-900 dark:text-white">john.hunter@email.com</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-stone-400" />
            <div>
              <div className="text-stone-600 dark:text-stone-400">Phone</div>
              <div className="text-stone-900 dark:text-white">+1 (555) 123-4567</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-6 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="w-5 h-5 text-green-700 dark:text-green-400" />
          <h3 className="text-stone-900 dark:text-white">Notification Preferences</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notif">Email Notifications</Label>
              <p className="text-stone-600 dark:text-stone-400 mt-1">Receive updates via email</p>
            </div>
            <Switch id="email-notif" defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="push-notif">Push Notifications</Label>
              <p className="text-stone-600 dark:text-stone-400 mt-1">Get instant mobile alerts</p>
            </div>
            <Switch id="push-notif" defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sms-notif">SMS Notifications</Label>
              <p className="text-stone-600 dark:text-stone-400 mt-1">Text message updates</p>
            </div>
            <Switch id="sms-notif" />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="shipment-notif">Shipment Updates</Label>
              <p className="text-stone-600 dark:text-stone-400 mt-1">Tracking and delivery alerts</p>
            </div>
            <Switch id="shipment-notif" defaultChecked />
          </div>
        </div>
      </Card>

      {/* Actions */}
      <Card className="p-6 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
        <Button 
          variant="destructive" 
          className="w-full"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </Card>
    </div>
  );
}

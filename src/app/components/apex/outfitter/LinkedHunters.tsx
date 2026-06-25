import { useState } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Search, UserPlus, Mail, QrCode, Copy } from 'lucide-react';
import { toast } from 'sonner';

const mockLinkedHunters = [
  {
    id: 'HNT001',
    name: 'John Hunter',
    country: 'United States',
    totalHunts: 3,
    totalTrophies: 15,
    lastActive: '2024-11-02',
  },
  {
    id: 'HNT002',
    name: 'Michael Thompson',
    country: 'Canada',
    totalHunts: 2,
    totalTrophies: 8,
    lastActive: '2024-10-17',
  },
  {
    id: 'HNT003',
    name: 'Robert Anderson',
    country: 'United States',
    totalHunts: 2,
    totalTrophies: 12,
    lastActive: '2024-11-04',
  },
  {
    id: 'HNT004',
    name: 'David Williams',
    country: 'United Kingdom',
    totalHunts: 1,
    totalTrophies: 3,
    lastActive: '2024-09-15',
  },
];

export function LinkedHunters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const filteredHunters = mockLinkedHunters.filter(hunter =>
    hunter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hunter.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendInvite = () => {
    if (inviteEmail) {
      toast.success('Invitation sent!', {
        description: `Hunter invite sent to ${inviteEmail}`,
      });
      setInviteEmail('');
      setShowInviteDialog(false);
    }
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText('https://apex-trophy.com/hunter/invite/OUT001');
    toast.success('Invite link copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-slate-100 mb-2">Your Hunters</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage hunters and send invitations
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)} className="gap-2">
          <UserPlus className="w-5 h-5" />
          Invite New Hunter
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/50 dark:to-lime-950/50 border-green-300 dark:border-green-800">
          <div className="text-stone-600 dark:text-stone-400 mb-1">Total Hunters</div>
          <div className="text-green-800 dark:text-green-400">{mockLinkedHunters.length}</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-950/50 dark:to-green-950/50 border-lime-300 dark:border-lime-800">
          <div className="text-stone-600 dark:text-stone-400 mb-1">Active This Month</div>
          <div className="text-lime-800 dark:text-lime-400">3</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-900/50 dark:to-emerald-950/50 border-green-400 dark:border-green-700">
          <div className="text-stone-600 dark:text-stone-400 mb-1">Total Hunts</div>
          <div className="text-green-900 dark:text-green-300">
            {mockLinkedHunters.reduce((sum, h) => sum + h.totalHunts, 0)}
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-emerald-300 dark:border-emerald-800">
          <div className="text-stone-600 dark:text-stone-400 mb-1">Total Trophies</div>
          <div className="text-emerald-800 dark:text-emerald-400">
            {mockLinkedHunters.reduce((sum, h) => sum + h.totalTrophies, 0)}
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-700 dark:text-green-500" />
          <Input
            placeholder="Search by name, country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Hunters Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hunter Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Total Hunts</TableHead>
                <TableHead>Total Trophies</TableHead>
                <TableHead>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHunters.map((hunter) => (
                <TableRow key={hunter.id}>
                  <TableCell>
                    <div>
                      <div className="text-slate-900 dark:text-slate-100">{hunter.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{hunter.id}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-700 dark:text-slate-300">
                    {hunter.country}
                  </TableCell>
                  <TableCell className="text-slate-700 dark:text-slate-300">
                    {hunter.totalHunts}
                  </TableCell>
                  <TableCell className="text-slate-700 dark:text-slate-300">
                    {hunter.totalTrophies}
                  </TableCell>
                  <TableCell className="text-slate-700 dark:text-slate-300">
                    {new Date(hunter.lastActive).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New Hunter</DialogTitle>
            <DialogDescription>
              Send an invitation link or QR code to connect a hunter to your outfitting service
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-slate-700 dark:text-slate-300 mb-2 block">
                Hunter Email Address
              </label>
              <Input
                type="email"
                placeholder="hunter@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="text-center py-4 border-t border-b border-stone-200 dark:border-stone-700">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Or share invite link</p>
              <div className="flex gap-2">
                <Input
                  value="https://apex-trophy.com/hunter/invite/OUT001"
                  readOnly
                  className="bg-stone-50 dark:bg-stone-800"
                />
                <Button variant="outline" size="icon" onClick={handleCopyInviteLink}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="text-center">
              <Button variant="outline" className="gap-2">
                <QrCode className="w-4 h-4" />
                Generate QR Code
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendInvite} disabled={!inviteEmail} className="gap-2">
              <Mail className="w-4 h-4" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

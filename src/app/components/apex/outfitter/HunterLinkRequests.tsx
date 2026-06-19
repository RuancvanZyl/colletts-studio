import { useState } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Calendar,
  MapPin,
  User as UserIcon,
  Filter
} from 'lucide-react';
import { LinkRequestDetailsModal } from './LinkRequestDetailsModal';
import { ApprovalConfirmationModal } from './ApprovalConfirmationModal';
import { DeclineModal } from './DeclineModal';
import { toast } from 'sonner@2.0.3';

interface HuntLinkRequest {
  id: string;
  huntId: string;
  huntName: string;
  hunterName: string;
  hunterEmail: string;
  hunterPhone: string;
  hunterCountry: string;
  startDate: Date;
  endDate: Date;
  region: string;
  farmName?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'declined';
  requestDate: Date;
  idDocument?: string;
}

export function HunterLinkRequests() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'approved' | 'declined'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<HuntLinkRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  
  // Mock data - would come from API
  const [requests, setRequests] = useState<HuntLinkRequest[]>([
    {
      id: 'req-001',
      huntId: 'HUNT-2025-0234',
      huntName: 'Limpopo Plains Safari',
      hunterName: 'John Meyer',
      hunterEmail: 'john.meyer@example.com',
      hunterPhone: '+1 555-0123',
      hunterCountry: 'United States',
      startDate: new Date('2025-05-04'),
      endDate: new Date('2025-05-08'),
      region: 'Limpopo Province',
      farmName: 'Bushveld Reserve',
      notes: 'Looking forward to hunting kudu and impala',
      status: 'pending',
      requestDate: new Date('2025-01-20'),
      idDocument: 'passport_john_meyer.pdf'
    },
    {
      id: 'req-002',
      huntId: 'HUNT-2025-0187',
      huntName: 'Kalahari Experience',
      hunterName: 'Sarah Johnson',
      hunterEmail: 'sarah.j@example.com',
      hunterPhone: '+44 20 7123 4567',
      hunterCountry: 'United Kingdom',
      startDate: new Date('2025-06-15'),
      endDate: new Date('2025-06-22'),
      region: 'Northern Cape',
      status: 'pending',
      requestDate: new Date('2025-01-22'),
      idDocument: 'passport_sarah_johnson.pdf'
    },
    {
      id: 'req-003',
      huntId: 'HUNT-2025-0145',
      huntName: 'Eastern Cape Safari',
      hunterName: 'Michael Roberts',
      hunterEmail: 'm.roberts@example.com',
      hunterPhone: '+61 2 9876 5432',
      hunterCountry: 'Australia',
      startDate: new Date('2025-04-10'),
      endDate: new Date('2025-04-17'),
      region: 'Eastern Cape',
      farmName: 'Addo Game Reserve',
      status: 'approved',
      requestDate: new Date('2025-01-15'),
    },
    {
      id: 'req-004',
      huntId: 'HUNT-2025-0098',
      huntName: 'Kruger Border Hunt',
      hunterName: 'David Anderson',
      hunterEmail: 'david.a@example.com',
      hunterPhone: '+1 310-555-7890',
      hunterCountry: 'United States',
      startDate: new Date('2025-07-01'),
      endDate: new Date('2025-07-05'),
      region: 'Mpumalanga',
      status: 'declined',
      requestDate: new Date('2025-01-18'),
    }
  ]);

  const filteredRequests = requests.filter(request => {
    // Filter by tab
    if (selectedTab !== 'all' && request.status !== selectedTab) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        request.hunterName.toLowerCase().includes(query) ||
        request.huntId.toLowerCase().includes(query) ||
        request.huntName.toLowerCase().includes(query) ||
        request.region.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400">Approved</Badge>;
      case 'declined':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400">Declined</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleViewDetails = (request: HuntLinkRequest) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleApproveClick = (request: HuntLinkRequest) => {
    setSelectedRequest(request);
    setShowApprovalModal(true);
  };

  const handleDeclineClick = (request: HuntLinkRequest) => {
    setSelectedRequest(request);
    setShowDeclineModal(true);
  };

  const handleApprovalConfirm = () => {
    if (selectedRequest) {
      setRequests(prev => 
        prev.map(req => 
          req.id === selectedRequest.id 
            ? { ...req, status: 'approved' as const }
            : req
        )
      );
      toast.success('Hunter linked successfully!', {
        description: `${selectedRequest.hunterName} has been linked to ${selectedRequest.huntId}`
      });
      setShowApprovalModal(false);
      setShowDetailsModal(false);
      setSelectedRequest(null);
    }
  };

  const handleDeclineConfirm = (reason?: string) => {
    if (selectedRequest) {
      setRequests(prev => 
        prev.map(req => 
          req.id === selectedRequest.id 
            ? { ...req, status: 'declined' as const }
            : req
        )
      );
      toast.success('Link request declined', {
        description: `Notification sent to ${selectedRequest.hunterName}`
      });
      setShowDeclineModal(false);
      setShowDetailsModal(false);
      setSelectedRequest(null);
    }
  };

  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    declined: requests.filter(r => r.status === 'declined').length,
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateRange = (start: Date, end: Date) => {
    return `${start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-slate-900 dark:text-white mb-2">Hunter Link Requests</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Review hunters who have requested to link a hunt with you
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by Hunter name or Hunt ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({counts.pending})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({counts.approved})
          </TabsTrigger>
          <TabsTrigger value="declined">
            Declined ({counts.declined})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          {filteredRequests.length === 0 ? (
            <Card className="p-12 text-center">
              <UserIcon className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-slate-900 dark:text-white mb-2">No Requests Found</h3>
              <p className="text-slate-600 dark:text-slate-400">
                {searchQuery 
                  ? 'Try adjusting your search criteria' 
                  : `No ${selectedTab === 'all' ? '' : selectedTab} requests at this time`
                }
              </p>
            </Card>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-stone-50 dark:bg-stone-900/50 border-b border-stone-200 dark:border-stone-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Hunter Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Hunt ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Hunt Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Dates
                          </th>
                          <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Region
                          </th>
                          <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-stone-950 divide-y divide-stone-200 dark:divide-stone-800">
                        {filteredRequests.map((request) => (
                          <tr 
                            key={request.id}
                            className="hover:bg-stone-50 dark:hover:bg-stone-900/50 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm">
                                  {request.hunterName.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                  <p className="text-sm text-slate-900 dark:text-white">
                                    {request.hunterName}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {request.hunterCountry}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant="secondary" className="font-mono text-xs">
                                {request.huntId}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-slate-900 dark:text-white">
                                {request.huntName}
                              </p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                                <Calendar className="w-3 h-3" />
                                {formatDateRange(request.startDate, request.endDate)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                                <MapPin className="w-3 h-3" />
                                {request.region}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(request.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetails(request)}
                                  className="text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400"
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                                {request.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleApproveClick(request)}
                                      className="text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeclineClick(request)}
                                      className="text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400"
                                    >
                                      <XCircle className="w-4 h-4 mr-1" />
                                      Decline
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredRequests.map((request) => (
                  <Card key={request.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white">
                          {request.hunterName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-slate-900 dark:text-white">
                            {request.hunterName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {request.hunterCountry}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Hunt ID</span>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {request.huntId}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Hunt: </span>
                        <span className="text-slate-900 dark:text-white">{request.huntName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {formatDateRange(request.startDate, request.endDate)}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                        <MapPin className="w-3 h-3" />
                        {request.region}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(request)}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                      {request.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApproveClick(request)}
                            className="text-green-600 border-green-300 hover:bg-green-50 dark:text-green-500 dark:border-green-800"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeclineClick(request)}
                            className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-500 dark:border-red-800"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {selectedRequest && (
        <>
          <LinkRequestDetailsModal
            request={selectedRequest}
            open={showDetailsModal}
            onOpenChange={setShowDetailsModal}
            onApprove={() => {
              setShowDetailsModal(false);
              setShowApprovalModal(true);
            }}
            onDecline={() => {
              setShowDetailsModal(false);
              setShowDeclineModal(true);
            }}
          />

          <ApprovalConfirmationModal
            request={selectedRequest}
            open={showApprovalModal}
            onOpenChange={setShowApprovalModal}
            onConfirm={handleApprovalConfirm}
          />

          <DeclineModal
            request={selectedRequest}
            open={showDeclineModal}
            onOpenChange={setShowDeclineModal}
            onConfirm={handleDeclineConfirm}
          />
        </>
      )}
    </div>
  );
}

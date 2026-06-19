import { useState } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { Search, User, Plus, Mail, Phone, FileText } from 'lucide-react';
import { mockClients, mockTrophies } from '../mockData';
import { StatusBadge } from '../StatusBadge';

export function ClientSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const filteredClients = mockClients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone.includes(searchQuery)
  );

  const selectedClientData = mockClients.find(c => c.id === selectedClient);
  const clientTrophies = selectedClientData
    ? mockTrophies.filter(t => t.clientName === selectedClientData.name)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-slate-900 mb-2">Client Management</h1>
        <p className="text-slate-600">Search and manage client information</p>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="pl-10"
          />
        </div>
      </Card>

      {!selectedClient ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.length === 0 ? (
            <Card className="col-span-full p-12 text-center">
              <User className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-slate-900 mb-2">No clients found</h3>
              <p className="text-slate-600">Try adjusting your search</p>
            </Card>
          ) : (
            filteredClients.map((client) => (
              <Card
                key={client.id}
                className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedClient(client.id)}
              >
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gradient-to-br from-green-700 via-green-600 to-lime-600 text-white">
                      {client.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-slate-900 truncate">{client.name}</h3>
                    <p className="text-slate-600">{client.trophyCount} trophies</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4" />
                    <span>{client.phone}</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={() => setSelectedClient(null)}
          >
            ← Back to Clients
          </Button>

          {selectedClientData && (
            <>
              {/* Client Info Card */}
              <Card className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarFallback className="bg-gradient-to-br from-green-700 via-green-600 to-lime-600 text-white text-xl">
                        {selectedClientData.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-slate-900 mb-1">{selectedClientData.name}</h2>
                      <p className="text-slate-600">
                        {selectedClientData.trophyCount} active trophies
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      New Quote
                    </Button>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      New Order
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-slate-600">Email</div>
                      <div className="text-slate-900">{selectedClientData.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-slate-600">Phone</div>
                      <div className="text-slate-900">{selectedClientData.phone}</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="orders" className="w-full">
                <TabsList>
                  <TabsTrigger value="orders">Orders</TabsTrigger>
                  <TabsTrigger value="quotes">Quotes</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>

                <TabsContent value="orders" className="mt-6">
                  <Card>
                    <div className="p-6 border-b border-slate-200">
                      <h3 className="text-slate-900">Active Orders</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {clientTrophies.map((trophy) => (
                        <div key={trophy.id} className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="text-slate-900 mb-1">{trophy.species}</h4>
                              <p className="text-slate-600">{trophy.id}</p>
                            </div>
                            <StatusBadge status={trophy.currentStage} />
                          </div>
                          <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-600 via-green-500 to-lime-500 h-2 rounded-full"
                              style={{ width: `${trophy.progress}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-slate-600">{trophy.parts.length} parts</span>
                            <span className="text-slate-900">{trophy.progress}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="quotes" className="mt-6">
                  <Card className="p-12 text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                    <h3 className="text-slate-900 mb-2">No Quotes</h3>
                    <p className="text-slate-600 mb-4">No pending quotes for this client</p>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Quote
                    </Button>
                  </Card>
                </TabsContent>

                <TabsContent value="documents" className="mt-6">
                  <Card className="p-12 text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                    <h3 className="text-slate-900 mb-2">No Documents</h3>
                    <p className="text-slate-600">No documents uploaded yet</p>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      )}
    </div>
  );
}

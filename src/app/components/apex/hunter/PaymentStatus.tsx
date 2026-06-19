import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Payment } from '../types';
import { 
  DollarSign, 
  Download, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  FileText
} from 'lucide-react';

interface PaymentStatusProps {
  payments: Payment[];
}

export function PaymentStatus({ payments }: PaymentStatusProps) {
  const totalPaid = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payments
    .filter(p => p.status === 'pending' || p.status === 'processing')
    .reduce((sum, p) => sum + p.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-stone-900 dark:text-white mb-2">Payment Status</h1>
        <p className="text-stone-600 dark:text-stone-400">Track all your payments and invoices</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/50 dark:to-lime-950/50 border-green-300 dark:border-green-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-700 dark:text-green-400" />
            </div>
            <div>
              <div className="text-stone-600 dark:text-stone-400">Total Paid</div>
              <div className="text-green-800 dark:text-green-400">
                {formatCurrency(totalPaid)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/50 border-amber-300 dark:border-amber-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-800 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-stone-600 dark:text-stone-400">Pending</div>
              <div className="text-amber-800 dark:text-amber-400">
                {formatCurrency(totalPending)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/50 dark:to-sky-950/50 border-blue-300 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-stone-600 dark:text-stone-400">Transactions</div>
              <div className="text-blue-800 dark:text-blue-400">
                {payments.length}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Payment List */}
      <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
        <div className="p-6 border-b border-stone-200 dark:border-stone-800">
          <h3 className="text-stone-900 dark:text-white">Recent Payments</h3>
        </div>

        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {payments.map((payment) => (
            <div key={payment.id} className="p-6 hover:bg-green-50 dark:hover:bg-stone-800/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  {payment.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-600 mt-1" />}
                  {payment.status === 'pending' && <Clock className="w-4 h-4 text-amber-600 mt-1" />}
                  {payment.status === 'processing' && <AlertCircle className="w-4 h-4 text-blue-600 mt-1" />}
                  {payment.status === 'failed' && <XCircle className="w-4 h-4 text-red-600 mt-1" />}
                  
                  <div>
                    <div className="text-stone-900 dark:text-white mb-1">
                      {payment.type.charAt(0).toUpperCase() + payment.type.slice(1)} Payment
                    </div>
                    <div className="text-stone-600 dark:text-stone-400 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <span>{payment.method}</span>
                      <span>•</span>
                      <span>{formatDate(payment.date)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-stone-900 dark:text-white mb-2">
                    {formatCurrency(payment.amount)}
                  </div>
                  <Badge className={
                    payment.status === 'completed' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : payment.status === 'pending'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  }>
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </Badge>
                </div>
              </div>

              {payment.dueDate && payment.status === 'pending' && (
                <div className="mt-3 flex items-center gap-2 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span>Due by {formatDate(payment.dueDate)}</span>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                {payment.invoiceUrl && (
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Invoice
                  </Button>
                )}
                {payment.receiptUrl && (
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Receipt
                  </Button>
                )}
                {payment.status === 'pending' && (
                  <Button size="sm" className="bg-green-700 hover:bg-green-800 text-white">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Pay Now
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

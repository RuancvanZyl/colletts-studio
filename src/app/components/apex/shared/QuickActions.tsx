import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Plus, Scan, Upload, FileText, Users, Trophy } from 'lucide-react';
import { usePortalTheme } from '../PortalThemeProvider';

interface QuickAction {
  icon: any;
  label: string;
  description: string;
  onClick: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  const { theme } = usePortalTheme();

  return (
    <Card className="p-6">
      <h3 className="text-slate-900 dark:text-slate-100 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            className={`h-auto flex-col items-center justify-center p-4 gap-2 hover:${theme.borderLight} hover:bg-gradient-to-br hover:${theme.bgLight}`}
            onClick={action.onClick}
          >
            <action.icon className="w-6 h-6" />
            <span className="text-xs text-center">{action.label}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
}

// Preset quick actions for different portals
export const hunterQuickActions: QuickAction[] = [
  {
    icon: Plus,
    label: 'Add Trophy',
    description: 'Register a new trophy',
    onClick: () => {},
  },
  {
    icon: Trophy,
    label: 'Track Status',
    description: 'View trophy progress',
    onClick: () => {},
  },
  {
    icon: FileText,
    label: 'Documents',
    description: 'Upload documents',
    onClick: () => {},
  },
];

export const outfitterQuickActions: QuickAction[] = [
  {
    icon: Plus,
    label: 'New Hunt',
    description: 'Create a hunt',
    onClick: () => {},
  },
  {
    icon: Users,
    label: 'Invite Hunter',
    description: 'Send invitation',
    onClick: () => {},
  },
  {
    icon: Upload,
    label: 'Upload Licence',
    description: 'Update documents',
    onClick: () => {},
  },
];

export const taxidermyQuickActions: QuickAction[] = [
  {
    icon: Scan,
    label: 'Scan Item',
    description: 'RFID/QR scan',
    onClick: () => {},
  },
  {
    icon: Plus,
    label: 'New Intake',
    description: 'Register trophy',
    onClick: () => {},
  },
  {
    icon: FileText,
    label: 'Update Status',
    description: 'Change stage',
    onClick: () => {},
  },
];

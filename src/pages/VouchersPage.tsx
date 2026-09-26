import { useSearchParams } from 'react-router-dom';
import { Gift, TicketPercent } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DiscountCodesTab from '@/components/vouchers/DiscountCodesTab';
import GiftVouchersTab from '@/components/vouchers/GiftVouchersTab';

type Tab = 'codes' | 'gift';

const VouchersPage = () => {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'gift' ? 'gift' : 'codes';

  return (
    <AdminLayout title="Vouchers & codes">
      <Tabs value={tab} onValueChange={v => setParams({ tab: v }, { replace: true })}>
        <TabsList className="mb-5">
          <TabsTrigger value="codes" className="gap-2"><TicketPercent className="w-4 h-4" />Discount codes</TabsTrigger>
          <TabsTrigger value="gift" className="gap-2"><Gift className="w-4 h-4" />Gift vouchers</TabsTrigger>
        </TabsList>
        <TabsContent value="codes"><DiscountCodesTab /></TabsContent>
        <TabsContent value="gift"><GiftVouchersTab /></TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default VouchersPage;

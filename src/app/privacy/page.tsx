import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Privacy Policy | Kebijakan Privasi' };

export default function PrivacyPage() {
  return <LegalPage doc="privacy" />;
}

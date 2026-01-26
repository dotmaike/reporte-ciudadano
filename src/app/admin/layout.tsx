import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Panel de Administración',
  description: 'Gestiona los reportes ciudadanos de Coatepec, Veracruz',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}

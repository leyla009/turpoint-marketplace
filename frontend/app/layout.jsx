import './globals.css';

export const metadata = {
  title: 'TurPoint',
  description: 'Azərbaycanda tur operatorları və bələdçilər üçün marketplace',
};

export default function RootLayout({ children }) {
  return (
    <html lang="az">
      <body className="bg-sand text-dusk">{children}</body>
    </html>
  );
}

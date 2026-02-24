import Sidebar from './_components/sidebar/Sidebar'
import Header from './_components/header/Header'
import MainContent from './_components/main/MainContent'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <MainContent>{children}</MainContent>
      </div>
    </div>
  )
}

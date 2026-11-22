import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  BookOpen,
  ClipboardList,
  Download,
  LogOut,
  Mail,
  Menu,
  Plus,
  Users,
  X,
} from 'lucide-react';
import { auth, signOutUser } from './lib/firebase';
import {
  createOrder,
  deleteOrder,
  seedSampleOrders,
  subscribeToOrders,
  updateOrder,
  updateOrderStatus,
} from './services/ordersService';
import {
  getTodayIsoDate,
  type Order,
  type OrderFormValues,
  type OrderStatus,
} from './types/order';
import { ORDER_STATUS_MAP } from './data/reformsCatalog';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthScreen } from './components/AuthScreen';
import { OrdersView } from './components/OrdersView';
import { OrderFormDrawer } from './components/OrderFormDrawer';
import { OrderDetailDrawer } from './components/OrderDetailDrawer';
import { ReformsCatalogView } from './components/ReformsCatalogView';
import { ClientsView } from './components/ClientsView';
import { EmailClientModal } from './components/EmailClientModal';

type ActiveSection = 'orders' | 'catalog' | 'clients';

const SECTION_LABELS: Record<ActiveSection, string> = {
  orders: 'Pedidos',
  catalog: 'Catálogo CR',
  clients: 'Clientes',
};

function escapeCsvCell(value: string): string {
  const safe = value.replace(/"/g, '""');
  return `"${safe}"`;
}

function downloadOrdersCsv(orders: Order[]) {
  const headers = [
    'Matrícula',
    'Fecha de creación',
    'Estado del pedido',
    'Marca del vehículo',
    'Modelo',
    'Códigos de reforma',
    'Reformas del vehículo',
    'Cliente',
    'Contacto cliente',
    'Precio laboratorio (€)',
    'Precio final (€)',
    'Ganancia (€)',
    'Observaciones',
  ];

  const rows = orders.map((order) => [
    order.licensePlate,
    order.orderDate,
    ORDER_STATUS_MAP[order.status]?.label ?? order.status,
    order.vehicleBrand,
    order.vehicleModel ?? '',
    order.reformCodes.join('; '),
    order.vehicleReforms,
    order.clientName,
    order.clientContact ?? '',
    order.labPrice.toFixed(2),
    order.finalPrice.toFixed(2),
    order.profit.toFixed(2),
    order.notes ?? '',
  ]);

  const csvContent =
    '\uFEFF' +
    [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(','))
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pedidos-reformas-${getTodayIsoDate()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function WorkspaceApp() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState<Error | null>(null);

  const [activeSection, setActiveSection] = useState<ActiveSection>('orders');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [presetReformCode, setPresetReformCode] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [emailModalOrderId, setEmailModalOrderId] = useState<string | null>(null);

  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    notifyOrderId?: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (!currentUser) {
        setOrders([]);
        setOrdersLoading(false);
        setSelectedOrderId(null);
        setEmailModalOrderId(null);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    setOrdersLoading(true);
    setSubscriptionError(null);

    const unsubscribe = subscribeToOrders(
      user.uid,
      (loadedOrders) => {
        setOrders(loadedOrders);
        setOrdersLoading(false);
      },
      (err) => {
        setOrdersLoading(false);
        setSubscriptionError(err);
      }
    );

    return unsubscribe;
  }, [authReady, user]);

  // Surface Firestore permission errors to ErrorBoundary cleanly
  if (subscriptionError) {
    throw subscriptionError;
  }

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  const emailModalOrder = useMemo(
    () => orders.find((o) => o.id === emailModalOrderId) ?? null,
    [orders, emailModalOrderId]
  );

  const showToast = (message: string, notifyOrderId?: string) => {
    setToast({ message, notifyOrderId });
    window.setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, notifyOrderId ? 6500 : 3200);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm text-slate-600">Cargando espacio de trabajo...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const openCreateModal = (initialCode?: string) => {
    setEditingOrder(null);
    setPresetReformCode(initialCode ?? null);
    setFormOpen(true);
  };

  const openEditModal = (order: Order) => {
    setSelectedOrderId(null);
    setPresetReformCode(null);
    setEditingOrder(order);
    setFormOpen(true);
  };

  const handleFormSubmit = async (
    values: OrderFormValues,
    editingOrderId?: string
  ) => {
    if (editingOrderId) {
      await updateOrder(editingOrderId, values);
      showToast(`Pedido ${values.licensePlate.toUpperCase()} actualizado.`);
    } else {
      await createOrder(user.uid, values);
      showToast(`Pedido ${values.licensePlate.toUpperCase()} registrado.`);
    }
  };

  const handleStatusChange = async (order: Order, nextStatus: OrderStatus) => {
    await updateOrderStatus(order, nextStatus);
    showToast(
      `Estado actualizado a ${ORDER_STATUS_MAP[nextStatus]?.label ?? nextStatus}.`,
      order.id
    );
  };

  const handleOpenEmailModal = (order: Order) => {
    setToast(null);
    setEmailModalOrderId(order.id);
  };

  const handleDeleteOrder = async (orderId: string) => {
    await deleteOrder(orderId);
    showToast('Pedido eliminado del registro.');
  };

  const handleSeedSamples = async () => {
    setSeeding(true);
    try {
      await seedSampleOrders(user.uid, getTodayIsoDate());
      showToast('4 pedidos de ejemplo añadidos a tu cuenta.');
    } finally {
      setSeeding(false);
    }
  };

  const handleFilterByClient = (clientName: string) => {
    setSearchQuery(clientName);
    setActiveSection('orders');
  };

  const handleSignOut = async () => {
    await signOutUser();
  };

  const navItems: Array<{
    id: ActiveSection;
    label: string;
    icon: typeof ClipboardList;
    count?: number;
  }> = [
    {
      id: 'orders',
      label: 'Pedidos',
      icon: ClipboardList,
      count: orders.length,
    },
    {
      id: 'catalog',
      label: 'Catálogo CR',
      icon: BookOpen,
    },
    {
      id: 'clients',
      label: 'Clientes',
      icon: Users,
    },
  ];

  const renderSidebarContent = () => (
    <div className="h-full flex flex-col bg-white">
      <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between shrink-0">
        <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
          AutoReforma
        </span>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Cerrar menú"
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Navegación principal">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveSection(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full px-3 py-2.5 text-sm font-medium rounded-md flex items-center justify-between transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-800'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5 whitespace-nowrap">
                <Icon
                  className={`w-4 h-4 shrink-0 ${active ? 'text-blue-700' : 'text-slate-400'}`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </span>
              {typeof item.count === 'number' && (
                <span className="font-mono text-xs tabular-nums text-slate-500">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 shrink-0">
        <div className="px-2">
          <p className="text-xs font-medium text-slate-900 truncate">
            {user.displayName || 'Usuario autenticado'}
          </p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-3 w-full px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-2"
        >
          <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200 bg-white sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/35"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[82vw] h-full border-r border-slate-200 bg-white">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on left, 1-2 primary actions on right */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú de navegación"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0 whitespace-nowrap">
              <span className="text-slate-500">Panel</span>
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-slate-900 truncate">
                {SECTION_LABELS[activeSection]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {orders.length > 0 && (
              <button
                type="button"
                onClick={() => downloadOrdersCsv(orders)}
                className="h-9 px-3.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Exportar CSV</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => openCreateModal()}
              className="h-9 px-4 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors inline-flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Nuevo pedido</span>
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1440px] w-full mx-auto">
          {activeSection === 'orders' && (
            <OrdersView
              orders={orders}
              loading={ordersLoading}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onSelectOrder={(order) => setSelectedOrderId(order.id)}
              onEditOrder={openEditModal}
              onEmailClient={handleOpenEmailModal}
              onQuickStatusChange={handleStatusChange}
              onCreateOrder={() => openCreateModal()}
              onSeedSamples={handleSeedSamples}
              seeding={seeding}
            />
          )}

          {activeSection === 'catalog' && (
            <ReformsCatalogView
              orders={orders}
              onCreateWithCode={(code) => openCreateModal(code)}
            />
          )}

          {activeSection === 'clients' && (
            <ClientsView
              orders={orders}
              onFilterByClient={handleFilterByClient}
              onCreateOrder={() => openCreateModal()}
            />
          )}
        </main>
      </div>

      {/* Create / Edit Slide-Over Drawer */}
      <OrderFormDrawer
        isOpen={formOpen}
        editingOrder={editingOrder}
        initialReformCode={presetReformCode}
        onClose={() => {
          setFormOpen(false);
          setEditingOrder(null);
          setPresetReformCode(null);
        }}
        onSubmit={handleFormSubmit}
      />

      {/* Order Detail Slide-Over Drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrderId(null)}
        onEdit={openEditModal}
        onEmailClient={handleOpenEmailModal}
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteOrder}
      />

      {/* Explicit Confirmation Modal for Gmail Status Notifications */}
      <EmailClientModal
        order={emailModalOrder}
        senderEmail={user.email}
        onClose={() => setEmailModalOrderId(null)}
        onSent={(recipient, plate) =>
          showToast(`Correo enviado a ${recipient} (${plate}).`)
        }
      />

      {/* Transient Confirmation Notice */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-md shadow-sm flex items-center gap-3"
        >
          <span>{toast.message}</span>
          {toast.notifyOrderId && (
            <button
              type="button"
              onClick={() => {
                const target = orders.find((o) => o.id === toast.notifyOrderId);
                if (target) handleOpenEmailModal(target);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors whitespace-nowrap"
            >
              <Mail className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Avisar por correo</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <WorkspaceApp />
    </ErrorBoundary>
  );
}

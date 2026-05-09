import { useState, useEffect, useMemo } from 'react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp, where } from 'firebase/firestore';
import { MenuItem, UserProfile, Order, OrderItem, Category, OrderStatus, PaymentMethod, PickupTime } from './types';
import { INITIAL_MENU } from './data/menu';
import { ShoppingBag, 
  User as UserIcon, 
  LogOut, 
  Plus, 
  Minus, 
  Trash2, 
  Clock, 
  CheckCircle, 
  ChefHat, 
  Star,
  ChevronRight,
  Menu as MenuIcon,
  X,
  Bell,
  UtensilsCrossed,
  QrCode,
  Smartphone,
  CreditCard,
  Copy,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
const logo = '/logo.png';
const paypalLogo = '/paypal.svg';
const revolutLogo = '/revolut.jpg';
const weroLogo = '/wero-logo.png';
const weroQR = '/wero_qr.jpeg';
const backgroundImage = '/background.jpeg';

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, ...props }: any) => {
  const baseStyles = "px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2";
  const variants: any = {
    primary: "bg-logo-cream text-logo-text hover:opacity-90 shadow-sm",
    secondary: "bg-white text-logo-text border border-logo-text hover:bg-logo-cream",
    ghost: "bg-transparent text-logo-text hover:bg-white/10",
    outline: "bg-transparent text-logo-bordeaux border border-logo-bordeaux hover:bg-logo-bordeaux/10",
    dark: "bg-logo-text text-white hover:opacity-90"
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, variant = 'default' }: any) => {
  const variants: any = {
    default: "bg-gray-100 text-gray-800",
    pending: "bg-yellow-100 text-yellow-800",
    validated: "bg-blue-100 text-blue-800",
    ready: "bg-green-100 text-green-800",
    completed: "bg-gray-100 text-gray-500",
    cancelled: "bg-red-100 text-red-800",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>("Plats");
  const [view, setView] = useState<'menu' | 'cart' | 'orders' | 'admin'>('menu');
  const [activeAdminTab, setActiveAdminTab] = useState<'orders' | 'menu'>('orders');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('counter');
  const [pickupTime, setPickupTime] = useState<PickupTime>('now');
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const [newItem, setNewItem] = useState<{name: string, description: string, price: string, category: Category}>({
    name: '',
    description: '',
    price: '',
    category: 'Plats'
  });
  const [editingPrices, setEditingPrices] = useState<{[key: string]: string}>({});
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showNotification, setShowNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          const owners = ['agencevisiondigitale@gmail.com', 'sosdepannage54@gmail.com', 'contact@immo-khattabi-conseil.ma', 'ouazzani9633@gmail.com'];
          const isOwnerInList = owners.includes(firebaseUser.email || '');
          
          if (isOwnerInList && userData.role !== 'owner') {
            userData.role = 'owner';
            await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'owner' });
          }
          
          setProfile(userData);
          if (userData.role === 'owner') setView('admin');
        } else {
          // Create default profile
          const owners = ['agencevisiondigitale@gmail.com', 'sosdepannage54@gmail.com', 'contact@immo-khattabi-conseil.ma', 'ouazzani9633@gmail.com'];
          const isOwner = owners.includes(firebaseUser.email || '');
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            loyaltyPoints: 0,
            role: isOwner ? 'owner' : 'customer'
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setProfile(newProfile);
          if (isOwner) setView('admin');
        }
      } else {
        setProfile(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Menu Listener
  useEffect(() => {
    let isSeeding = false;
    const unsubscribe = onSnapshot(collection(db, 'menu'), (snapshot) => {
      const menuData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
      
      // Cleanup specifically requested 'dddd' items that the user can't delete manually
      const itemsToDelete = menuData.filter(item => item.name.toLowerCase().includes('dddd'));
      if (itemsToDelete.length > 0 && profile?.role === 'owner') {
        itemsToDelete.forEach(item => {
          deleteDoc(doc(db, 'menu', item.id));
        });
      }

      setMenu(menuData.filter(item => !item.name.toLowerCase().includes('dddd')));
      
      // Seed menu if empty and user is owner
      if (menuData.length === 0 && profile?.role === 'owner' && !isSeeding) {
        isSeeding = true;
        Promise.all(INITIAL_MENU.map(item => addDoc(collection(db, 'menu'), item)))
          .then(() => { isSeeding = false; })
          .catch(e => { 
            isSeeding = false;
            handleFirestoreError(e, OperationType.CREATE, 'menu');
          });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'menu');
    });
    return () => unsubscribe();
  }, [profile]);

  // Orders Listener
  useEffect(() => {
    if (!user || !profile) return;

    let q;
    if (profile.role === 'owner') {
      q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      // Check for new validated orders to notify user
      if (profile.role === 'customer') {
        const lastOrder = ordersData[0];
        const prevOrder = orders.find(o => o.id === lastOrder?.id);
        if (lastOrder && prevOrder && lastOrder.status !== prevOrder.status) {
          notify(`Votre commande est maintenant: ${lastOrder.status}`);
        }
      } else if (profile.role === 'owner') {
        const newOrders = ordersData.filter(o => o.status === 'pending');
        if (newOrders.length > orders.filter(o => o.status === 'pending').length) {
          notify("Nouvelle commande reçue !");
        }
      }

      setOrders(ordersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
    return () => unsubscribe();
  }, [user, profile]);

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setShowNotification({ message, type });
    setTimeout(() => setShowNotification(null), 3000);
  };

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = () => signOut(auth);

  const addToCart = (item: MenuItem) => {
    const existing = cart.find(i => i.menuItemId === item.id);
    if (existing) {
      setCart(cart.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, comment: '' }]);
    }
    notify(`${item.name} ajouté au panier`);
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(cart.map(i => {
      if (i.menuItemId === id) {
        const newQty = Math.max(0, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const updateCartComment = (id: string, comment: string) => {
    setCart(cart.map(i => i.menuItemId === id ? { ...i, comment } : i));
  };

  const totalCart = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const generateOrderSMS = (order: Order) => {
    if (!order.items || order.items.length === 0) {
      return "ERREUR : Contenu de la commande vide. Veuillez contacter le restaurant.";
    }

    const itemsList = order.items.map(item => {
      let itemStr = `• ${item.quantity}x ${item.name}`;
      if (item.comment) itemStr += ` (${item.comment})`;
      return itemStr;
    }).join('\n');

    const paymentLabels = {
      'counter': 'Espèces / Comptoir',
      'paypal': 'Bouton Paypal',
      'wero': 'Wero',
      'revolut': 'Revolut'
    };

    const paymentLabel = paymentLabels[order.paymentMethod] || order.paymentMethod;
    const pickupLabel = order.pickupTime === 'now' ? 'Immédiatement' : 
                        order.pickupTime === '20min' ? 'Dans 20 minutes' : 'Dans 1 heure';
    
    const customer = order.customerName || 'Client';

    return `🍔 GA DÖNER GRILL 🍟\n` +
           `-------------------\n` +
           `👤 CLIENT : ${customer}\n` +
           `🆔 COMMANDE : #${order.id.slice(-4).toUpperCase()}\n` +
           `💳 PAIEMENT : ${paymentLabel}\n` +
           `🕒 RÉCUPÉRATION : ${pickupLabel}\n\n` +
           `🛒 PRODUITS :\n${itemsList}\n\n` +
           `💰 TOTAL : ${order.total.toFixed(2)}€\n` +
           `-------------------\n` +
           `Merci de préparer ma commande !`;
  };

  const sendOrderSMS = (order: Order) => {
    const message = encodeURIComponent(generateOrderSMS(order));
    // Restaurant number: +33749018193
    window.location.href = `sms:+33749018193?body=${message}`;
  };

  const placeOrder = async () => {
    if (!user || cart.length === 0) return;

    const newOrder: Omit<Order, 'id'> = {
      userId: user.uid,
      items: cart,
      total: totalCart,
      status: 'pending',
      paymentMethod: paymentMethod,
      pickupTime: pickupTime,
      createdAt: serverTimestamp(),
      pointsEarned: Math.floor(totalCart),
      customerName: user.displayName || 'Client',
      customerEmail: user.email || ''
    };

    try {
      const docRef = await addDoc(collection(db, 'orders'), newOrder);
      const orderId = docRef.id;
      
      const orderWithId = { ...newOrder, id: orderId } as Order;
      setLastPlacedOrder(orderWithId);
      setIsPaymentConfirmed(false);

      // If counter payment, send SMS immediately
      if (paymentMethod === 'counter') {
        sendOrderSMS(orderWithId);
      }

      // Update loyalty points
      if (profile) {
        await updateDoc(doc(db, 'users', user.uid), {
          loyaltyPoints: profile.loyaltyPoints + newOrder.pointsEarned
        });
      }

      // Notification system
      try {
        const response = await fetch('/api/send-order-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order: orderWithId,
            customerEmail: user.email,
            ownerEmail: 'contact@immo-khattabi-conseil.ma'
          })
        });
        const result = await response.json();
        console.log('[NOTIFY] Result:', result);
      } catch (e) {
        console.error("Notification trigger failed:", e);
      }

      setCart([]);
      if (paymentMethod === 'counter') {
        setView('orders');
      }
      notify("Commande enregistrée !");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    }
  };

  const confirmPaymentAndNotify = () => {
    if (lastPlacedOrder) {
      setIsPaymentConfirmed(true);
      sendOrderSMS(lastPlacedOrder);
      notify("Notification envoyée au restaurant !");
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      notify(`Commande ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    }
  };

  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const updateItemPrice = async (itemId: string, newPriceStr: string) => {
    const newPrice = parseFloat(newPriceStr);
    if (isNaN(newPrice) || newPrice < 0) {
      notify("Prix invalide", "error");
      return;
    }
    try {
      await updateDoc(doc(db, 'menu', itemId), { price: newPrice });
      notify("Prix mis à jour");
      setEditingPrices(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'menu');
    }
  };

  const addMenuItem = async (e: any) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) {
      notify("Veuillez remplir le nom et le prix.");
      return;
    }

    try {
      await addDoc(collection(db, 'menu'), {
        ...newItem,
        price: parseFloat(newItem.price)
      });
      notify(`${newItem.name} ajouté au menu !`);
      setNewItem({ name: '', description: '', price: '', category: 'Plats' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'menu');
    }
  };

  const clearAllOrders = async () => {
    if (orders.length === 0) return;
    setIsDeletingAll(true);
    notify("Suppression de toutes les commandes...");
    
    try {
      console.log('[DEBUG] starting mass deletion of', orders.length, 'orders');
      
      // Batch delete would be better but simple loops work for reasonable volumes
      const deletePromises = orders.map(order => deleteDoc(doc(db, 'orders', order.id)));
      await Promise.all(deletePromises);
      
      notify("Toutes les commandes ont été supprimées avec succès.");
      console.log('[DEBUG] mass deletion complete');
    } catch (error) {
      console.error('[DEBUG] mass deletion failed', error);
      handleFirestoreError(error, OperationType.DELETE, 'orders');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const categories: Category[] = [
    "Entrées", "Plats", "Grillades", "Kebab", "Bowl", "Americain", "Pidé", 
    "Boissons", "Bières", "Desserts"
  ];

  if (!isAuthReady) {
    return (
      <div 
        className="min-h-screen bg-logo-bordeaux flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: `linear-gradient(rgba(97, 8, 7, 0.65), rgba(97, 8, 7, 0.65)), url(${backgroundImage})` }}
      >
        <div className="flex flex-col items-center gap-6 relative z-10">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center p-3"
          >
            <img src={logo} alt="Loading" className="w-full h-full object-contain" />
          </motion.div>
          <p className="text-gray-500 font-medium">Chargement de GA Döner & Grill...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div 
        className="min-h-screen bg-logo-bordeaux flex flex-col items-center justify-center p-6 text-center bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: `linear-gradient(rgba(97, 8, 7, 0.65), rgba(97, 8, 7, 0.65)), url(${backgroundImage})` }}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-gray-100 relative z-10"
        >
          <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl p-4 border border-gray-50">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">GA Döner & Grill</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">Le goût authentique du grill.<br/>Connectez-vous pour commander et profiter de vos points fidélité.</p>
          <Button onClick={login} className="w-full py-4 text-lg">
            Se connecter avec Google
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-logo-bordeaux text-white font-sans pb-24 bg-cover bg-center bg-fixed bg-no-repeat relative"
      style={{ backgroundImage: `linear-gradient(rgba(97, 8, 7, 0.6), rgba(97, 8, 7, 0.7)), url(${backgroundImage})` }}
    >
      <div className="relative z-10 min-h-screen flex flex-col w-full">
        {/* Header wrapper for max-width */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm w-full">
          <header className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between text-logo-text">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shadow-md ${profile?.role === 'owner' ? 'bg-indigo-600 shadow-indigo-600/20' : 'bg-white shadow-logo-cream/20'}`}>
                {profile?.role === 'owner' ? (
                  <UserIcon size={20} className="text-white" />
                ) : (
                  <img src={logo} alt="Logo" className="w-full h-full object-cover" onError={(e: any) => e.target.src = 'https://cdn-icons-png.flaticon.com/512/3170/3170733.png'} />
                )}
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight uppercase tracking-tight">
                  {profile?.role === 'owner' ? 'Dashboard' : 'GA Döner & Grill'}
                </h1>
                {profile && profile.role === 'customer' && (
                  <div className="flex items-center gap-1 text-xs text-logo-bordeaux font-bold">
                    <Star size={12} fill="currentColor" />
                    <span>{profile.loyaltyPoints} points</span>
                  </div>
                )}
                {profile && profile.role === 'owner' && (
                  <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                    Connecté en tant que Gérant
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {profile?.role === 'owner' && (
                <Button 
                  variant={view === 'admin' ? 'primary' : 'ghost'} 
                  onClick={() => setView('admin')}
                  className="p-2"
                >
                  <Bell size={20} />
                </Button>
              )}
              <Button variant="ghost" onClick={logout} className="p-2 text-gray-400 hover:text-red-500">
                <LogOut size={20} />
              </Button>
            </div>
          </header>
        </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          {view === 'menu' && (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Hero Logo */}
              <div className="flex flex-col items-center mb-10 mt-2">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 12 }}
                  className="w-32 h-32 rounded-3xl bg-white shadow-xl flex items-center justify-center p-4 border border-gray-50 mb-4"
                >
                  <img src={logo} alt="GA Döner & Grill" className="w-full h-full object-contain" />
                </motion.div>
                <h2 className="text-3xl font-black text-white">GA Döner & Grill</h2>
                <div className="w-12 h-1 bg-logo-cream mt-2 rounded-full opacity-50"></div>
              </div>

              {/* Categories Scroll / Flex */}
              <div className="flex gap-2 p-1 overflow-x-auto md:flex-wrap md:justify-center pb-4 no-scrollbar -mx-6 px-6 mb-8 group">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-[0.15em] transition-all duration-300 ${
                      activeCategory === cat 
                        ? 'bg-logo-cream text-logo-text shadow-xl scale-105 border-2 border-logo-cream' 
                        : 'bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/20'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Menu Items */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {menu.filter(item => item.category === activeCategory).map(item => (
                  <motion.div 
                    layout
                    key={item.id}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-white/10 flex justify-between items-center group text-logo-text"
                  >
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{item.name}</h3>
                      {item.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
                      <p className="text-logo-bordeaux font-bold mt-2">{item.price.toFixed(2)}€</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {profile?.role === 'owner' && (
                        <button 
                          onClick={() => {
                            deleteDoc(doc(db, 'menu', item.id))
                              .then(() => notify(`${item.name} supprimé`))
                              .catch(e => handleFirestoreError(e, OperationType.DELETE, 'menu'));
                          }}
                          className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                      <Button 
                        onClick={() => addToCart(item)}
                        className="w-10 h-10 p-0 rounded-full shadow-md"
                      >
                        <Plus size={20} />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Contact & Social Info */}
              <div className="mt-12 pt-8 border-t border-white/20 text-center">
                <p className="text-sm font-bold text-white/60 uppercase tracking-widest mb-4">Pour toute réservation et commande</p>
                <a href="tel:0383325244" className="text-2xl font-black text-white hover:text-logo-cream transition-colors">03.83.32.52.44</a>
                
                <div className="mt-8">
                  <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-2">Horaires</p>
                  <p className="text-sm text-white/90">Du lundi au jeudi: 11h30-14h30 | 18h30-22h30</p>
                  <p className="text-sm text-white/90">Vendredi et samedi: 11h30-14h30 | 18h30-23h30</p>
                  <p className="text-sm text-white/90">Dimanche: Fermé</p>
                </div>

                <div className="flex justify-center gap-6 mt-8">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <span className="font-bold text-lg text-logo-bordeaux">ig</span>
                    </div>
                    <span className="text-[10px] text-white/60 font-bold uppercase tracking-tight">Ga_donergrill</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <span className="font-bold text-lg text-logo-bordeaux">fb</span>
                    </div>
                    <span className="text-[10px] text-white/60 font-bold uppercase tracking-tight">Ga donergrill</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <span className="font-bold text-lg text-logo-bordeaux">tk</span>
                    </div>
                    <span className="text-[10px] text-white/60 font-bold uppercase tracking-tight">Gadonergrill</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'cart' && (
            <motion.div 
              key="cart"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-[2rem] p-4 sm:p-8 shadow-2xl border border-gray-100 max-h-[92vh] sm:max-h-[85vh] flex flex-col w-full max-w-3xl mx-auto"
            >
              <div className="flex items-center justify-between mb-4 sm:mb-8 shrink-0">
                <div className="flex items-center gap-3 sm:gap-4 text-logo-text">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-logo-cream/30 rounded-2xl flex items-center justify-center text-logo-bordeaux">
                    <ShoppingBag size={24} className="sm:w-7 sm:h-7" />
                  </div>
                  <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tighter">Mon Panier</h2>
                </div>
                <Button variant="ghost" onClick={() => setView('menu')} className="p-2 -mr-2 bg-gray-50 hover:bg-gray-100 rounded-full">
                  <X size={20} className="sm:w-6 sm:h-6" />
                </Button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-16 shrink-0 flex flex-col items-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag size={40} className="text-gray-200" />
                  </div>
                  <p className="text-gray-500 font-bold text-xl tracking-tight">Votre panier s'ennuie...</p>
                  <Button onClick={() => setView('menu')} className="mt-8 px-10 py-4 text-lg">Retour au Menu</Button>
                </div>
              ) : (
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex-1 overflow-y-auto no-scrollbar pr-2 -mx-4 px-4">
                    <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-10">
                      {cart.map(item => (
                        <div key={item.menuItemId} className="flex flex-col gap-3 p-4 sm:p-5 bg-gray-50/50 rounded-[1.5rem] border border-gray-100 group transition-all hover:bg-white hover:shadow-lg">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 pr-4 sm:pr-6">
                              <h4 className="font-black text-base sm:text-xl text-logo-text leading-tight group-hover:text-logo-bordeaux transition-colors">{item.name}</h4>
                              <p className="text-logo-bordeaux font-black text-sm sm:text-lg mt-0.5 sm:mt-1">{(item.price * item.quantity).toFixed(2)}€</p>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-4 bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
                              <button 
                                onClick={() => updateCartQuantity(item.menuItemId, -1)}
                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Minus size={16} className="sm:w-5 sm:h-5" />
                              </button>
                              <span className="font-black text-sm sm:text-lg w-5 sm:w-6 text-center text-logo-text">{item.quantity}</span>
                              <button 
                                onClick={() => updateCartQuantity(item.menuItemId, 1)}
                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-logo-bordeaux hover:scale-110 transition-transform"
                              >
                                <Plus size={16} className="sm:w-5 sm:h-5" />
                              </button>
                            </div>
                          </div>
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder="Instructions spéciales..." 
                              value={item.comment}
                              onChange={(e) => updateCartComment(item.menuItemId, e.target.value)}
                              className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-2 sm:py-3 text-[11px] sm:text-sm text-logo-text focus:ring-2 focus:ring-logo-bordeaux/20 outline-none transition-all italic shadow-inner"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-6 sm:space-y-8">
                      <div>
                        <h3 className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3 sm:mb-4 px-2">Heure de retrait souhaitée</h3>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                          {[
                            { id: 'now', label: 'Immédiat', desc: 'Prêt ASAP' },
                            { id: '20min', label: 'Dans 20 min', desc: 'Patientez' },
                            { id: '1h', label: 'Dans 1 h', desc: 'Plus tard' }
                          ].map((time) => (
                            <button 
                              key={time.id}
                              onClick={() => setPickupTime(time.id as PickupTime)}
                              className={`flex flex-col items-center gap-1 sm:gap-2 py-3 sm:py-4 rounded-[1.25rem] border-2 transition-all ${
                                pickupTime === time.id 
                                  ? 'border-logo-bordeaux bg-logo-bordeaux/5 text-logo-bordeaux shadow-md' 
                                  : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                              }`}
                            >
                              <Clock size={16} className="sm:w-5 sm:h-5" />
                              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight">{time.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3 sm:mb-4 px-2">Moyen de paiement</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                          <button 
                            onClick={() => setPaymentMethod('counter')}
                            className={`flex flex-col items-center justify-center gap-2 sm:gap-3 py-3 sm:py-5 px-3 rounded-[1.25rem] border-2 transition-all ${
                              paymentMethod === 'counter' 
                                ? 'border-logo-bordeaux bg-logo-bordeaux/5 text-logo-bordeaux shadow-md' 
                                : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                            }`}
                          >
                            <Smartphone size={20} className="sm:w-6 sm:h-6" />
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight text-center">Comptoir</span>
                          </button>
                          <button 
                            onClick={() => setPaymentMethod('paypal')}
                            className={`flex flex-col items-center justify-center gap-2 sm:gap-3 py-3 sm:py-5 px-3 rounded-[1.25rem] border-2 transition-all ${
                              paymentMethod === 'paypal' 
                                ? 'border-[#0070ba] bg-[#0070ba]/5 text-[#0070ba] shadow-md' 
                                : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                            }`}
                          >
                            <img src={paypalLogo} alt="PayPal" className="h-3 sm:h-4 object-contain" />
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight">PayPal</span>
                          </button>
                          <button 
                            onClick={() => setPaymentMethod('wero')}
                            className={`flex flex-col items-center justify-center gap-2 sm:gap-3 py-3 sm:py-5 px-3 rounded-[1.25rem] border-2 transition-all ${
                              paymentMethod === 'wero' 
                                ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-md' 
                                : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                            }`}
                          >
                            <img src={weroLogo} alt="Wero" className="h-3 sm:h-4 object-contain" />
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight">Wero</span>
                          </button>
                          <button 
                            onClick={() => setPaymentMethod('revolut')}
                            className={`flex flex-col items-center justify-center gap-2 sm:gap-3 py-3 sm:py-5 px-3 rounded-[1.25rem] border-2 transition-all ${
                              paymentMethod === 'revolut' 
                                ? 'border-black bg-black/5 text-black shadow-md' 
                                : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                            }`}
                          >
                            <img src={revolutLogo} alt="Revolut" className="h-3 sm:h-4 object-contain" />
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight">Revolut</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 sm:pt-8 mt-4 sm:mt-6 border-t-2 border-gray-100 shrink-0">
                    <div className="flex justify-between items-center mb-1 sm:mb-2 text-xs sm:text-base">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Star size={14} className="sm:w-4 sm:h-4" />
                        <span className="font-bold uppercase tracking-widest">Fidélité</span>
                      </div>
                      <span className="text-logo-bordeaux font-black">+{Math.floor(totalCart)} pts</span>
                    </div>
                    <div className="flex justify-between items-baseline mb-4 sm:mb-8">
                      <span className="text-logo-text font-black text-sm sm:text-lg uppercase tracking-tight">Total</span>
                      <div className="h-px flex-1 border-b-2 border-dotted border-gray-100 mx-3 sm:mx-4"></div>
                      <span className="text-xl sm:text-3xl font-black text-logo-bordeaux tabular-nums">{totalCart.toFixed(2)}€</span>
                    </div>

                    <div className="flex justify-center">
                      <button 
                        onClick={placeOrder}
                        className="w-full sm:w-auto px-10 py-3 sm:px-12 sm:py-4 bg-logo-bordeaux text-white rounded-2xl font-black uppercase text-xs sm:text-sm shadow-xl shadow-logo-bordeaux/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-3 group"
                      >
                        <ShoppingBag size={16} className="sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform" />
                        Finaliser ma Commande
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'orders' && (
            <motion.div 
              key="orders"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-4xl mx-auto w-full"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Clock size={20} />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Mes Commandes</h2>
              </div>
              {orders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
                  <Clock size={48} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-500 font-medium">Aucune commande pour le moment.</p>
                  <Button onClick={() => setView('menu')} className="mt-6">Commander maintenant</Button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 text-logo-text">
                  {orders.map(order => (
                    <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">
                            {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : 'En cours...'}
                          </p>
                          <h4 className="font-bold">Commande #{order.id.slice(-4).toUpperCase()}</h4>
                        </div>
                        <Badge variant={order.status}>{order.status.toUpperCase()}</Badge>
                      </div>
                      <div className="space-y-2 mb-4">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">{item.quantity}x {item.name}</span>
                            <span className="font-medium">{(item.price * item.quantity).toFixed(2)}€</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
                            {order.paymentMethod === 'paypal' ? 'PayPal' : order.paymentMethod === 'wero' ? 'Wero' : order.paymentMethod === 'revolut' ? 'Revolut' : 'Au Comptoir'}
                          </span>
                          <span className="font-bold">Total</span>
                        </div>
                        <span className="text-logo-bordeaux font-bold">{order.total.toFixed(2)}€</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {view === 'admin' && profile?.role === 'owner' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-logo-text"
            >
              <div className="flex flex-col gap-6 mb-8 text-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Administration</h2>
                  <div className="bg-logo-cream/20 text-logo-cream px-3 py-1 rounded-full text-xs font-bold border border-logo-cream/30">PROPRIÉTAIRE</div>
                </div>

                <div className="flex gap-2 p-1 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                  <button 
                    onClick={() => setActiveAdminTab('orders')}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeAdminTab === 'orders' ? 'bg-white text-logo-text shadow-sm' : 'text-white/60 hover:text-white'}`}
                  >
                    Commandes ({orders.length})
                  </button>
                  <button 
                    onClick={() => setActiveAdminTab('menu')}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeAdminTab === 'menu' ? 'bg-white text-logo-text shadow-sm' : 'text-white/60 hover:text-white'}`}
                  >
                    Menu ({menu.length})
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {activeAdminTab === 'orders' ? (
                  <motion.div 
                    key="orders-tab"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="text-logo-text"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-white/60 uppercase tracking-widest text-xs">Gestion des commandes</h3>
                      {orders.length > 0 && (
                        <Button 
                          variant="ghost" 
                          onClick={clearAllOrders}
                          disabled={isDeletingAll}
                          className="text-red-500 hover:bg-red-50 text-xs py-1"
                        >
                          <Trash2 size={16} className={isDeletingAll ? 'animate-spin' : ''} />
                          {isDeletingAll ? 'Suppression...' : 'Tout effacer'}
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      {orders.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                          <Clock size={48} className="mx-auto text-gray-200 mb-4" />
                          <p className="text-gray-500">Aucune commande pour le moment.</p>
                        </div>
                      ) : (
                        orders.map(order => (
                          <div key={order.id} className="bg-white p-6 rounded-3xl shadow-md border border-gray-100 text-logo-text">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-bold text-lg">{order.customerName}</h4>
                                  <Badge variant={order.status}>{order.status.toUpperCase()}</Badge>
                                </div>
                                <div className="flex gap-2 mb-1">
                                  <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase">
                                    {order.pickupTime === 'now' ? 'ASAP' : order.pickupTime === '20min' ? '20 min' : '1h'}
                                  </span>
                                  <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full uppercase">
                                    {order.paymentMethod}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400">
                                  {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : 'En cours...'}
                                </p>
                              </div>
                              <p className="text-xl font-black text-logo-bordeaux">{order.total.toFixed(2)}€</p>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="mb-2 last:mb-0">
                                  <div className="flex justify-between text-sm font-medium">
                                    <span>{item.quantity}x {item.name}</span>
                                    <span>{(item.price * item.quantity).toFixed(2)}€</span>
                                  </div>
                                  {item.comment && (
                                    <p className="text-xs text-logo-bordeaux italic mt-1">Note: {item.comment}</p>
                                  )}
                                </div>
                              ))}
                            </div>

                            <div className="flex gap-2">
                              {order.status === 'pending' && (
                                <Button onClick={() => updateOrderStatus(order.id, 'validated')} className="flex-1">Valider</Button>
                              )}
                              {order.status === 'validated' && (
                                <Button onClick={() => updateOrderStatus(order.id, 'ready')} className="flex-1 bg-green-500 hover:bg-green-600">Prêt</Button>
                              )}
                              {order.status === 'ready' && (
                                <Button onClick={() => updateOrderStatus(order.id, 'completed')} className="flex-1 bg-blue-500 hover:bg-blue-600">Terminé</Button>
                              )}
                              {['pending', 'validated'].includes(order.status) && (
                                <Button variant="ghost" onClick={() => updateOrderStatus(order.id, 'cancelled')} className="text-red-500 hover:bg-red-50">Annuler</Button>
                              )}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="menu-tab"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 mb-8 text-logo-text">
                      <h3 className="font-bold text-lg mb-4">Ajouter un produit</h3>
                      <form onSubmit={addMenuItem} className="grid sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Nom du produit</label>
                          <input 
                            type="text" 
                            value={newItem.name}
                            onChange={e => setNewItem({...newItem, name: e.target.value})}
                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-logo-bordeaux/20 text-logo-text"
                            placeholder="ex: Royal Cheese"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Description (optionnel)</label>
                          <textarea 
                            value={newItem.description}
                            onChange={e => setNewItem({...newItem, description: e.target.value})}
                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-logo-bordeaux/20 h-20 resize-none text-logo-text"
                            placeholder="ex: Steak, cheddar, oignons..."
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Prix (€)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={newItem.price}
                            onChange={e => setNewItem({...newItem, price: e.target.value})}
                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-logo-bordeaux/20 text-logo-text"
                            placeholder="9.50"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Catégorie</label>
                          <select 
                            value={newItem.category}
                            onChange={e => setNewItem({...newItem, category: e.target.value as Category})}
                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-logo-bordeaux/20 appearance-none text-logo-text"
                          >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <Button type="submit" className="sm:col-span-2 py-4 bg-logo-bordeaux text-white">Ajouter au menu</Button>
                      </form>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-bold text-white uppercase tracking-widest text-xs mb-4 px-2 italic">Liste des produits</h3>
                      {categories.map(cat => {
                        const catItems = menu.filter(i => i.category === cat);
                        if (catItems.length === 0) return null;
                        return (
                          <div key={cat} className="space-y-2">
                            <h4 className="text-sm font-bold text-white/80 px-2 mt-6 uppercase tracking-wider">{cat}</h4>
                            {catItems.map(item => (
                              <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group text-logo-text">
                                <div className="flex-1">
                                  <h5 className="font-black text-lg">{item.name}</h5>
                                  {editingPrices[item.id] !== undefined ? (
                                    <div className="flex items-center gap-2 mt-1">
                                      <input
                                        type="number"
                                        step="0.01"
                                        className="w-20 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm outline-none text-logo-text"
                                        value={editingPrices[item.id]}
                                        onChange={(e) => setEditingPrices({...editingPrices, [item.id]: e.target.value})}
                                        autoFocus
                                      />
                                      <span className="text-sm">€</span>
                                      <button 
                                        onClick={() => updateItemPrice(item.id, editingPrices[item.id])}
                                        className="text-xs bg-logo-bordeaux text-white px-3 py-1 rounded-lg font-bold"
                                      >
                                        OK
                                      </button>
                                      <button 
                                        onClick={() => setEditingPrices(prev => { const next = {...prev}; delete next[item.id]; return next; })}
                                        className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-lg font-bold"
                                      >
                                        Annuler
                                      </button>
                                    </div>
                                  ) : (
                                    <div 
                                      className="flex items-center gap-2 cursor-pointer hover:underline text-sm font-bold text-logo-bordeaux"
                                      onClick={() => setEditingPrices({...editingPrices, [item.id]: item.price.toString()})}
                                      title="Cliquer pour modifier le prix"
                                    >
                                      {item.price.toFixed(2)}€ <span className="text-[10px] text-gray-400 font-normal uppercase uppercase tracking-tighter">(modifier)</span>
                                    </div>
                                  )}
                                </div>
                                <button 
                                  onClick={() => {
                                    if (confirm(`Supprimer ${item.name} ?`)) {
                                      deleteDoc(doc(db, 'menu', item.id))
                                        .then(() => notify(`${item.name} supprimé`))
                                        .catch(e => handleFirestoreError(e, OperationType.DELETE, 'menu'));
                                    }
                                  }}
                                  className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                >
                                  <Trash2 size={20} />
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-4">
        <nav className="bg-white/95 backdrop-blur-xl border border-gray-100 px-8 py-4 rounded-full flex justify-around items-center w-full max-w-lg text-logo-text shadow-2xl">
        {profile?.role === 'customer' ? (
          <>
            <button 
              onClick={() => setView('menu')}
              className={`flex flex-col items-center gap-1 transition-all ${view === 'menu' ? 'text-logo-bordeaux' : 'text-gray-400'}`}
            >
              <MenuIcon size={24} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Menu</span>
            </button>
            
            <button 
              onClick={() => setView('cart')}
              className={`flex flex-col items-center gap-1 relative transition-all ${view === 'cart' ? 'text-logo-bordeaux' : 'text-gray-400'}`}
            >
              <ShoppingBag size={24} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-logo-bordeaux text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                  {cart.length}
                </span>
              )}
              <span className="text-[10px] font-bold uppercase tracking-wider">Panier</span>
            </button>

            <button 
              onClick={() => setView('orders')}
              className={`flex flex-col items-center gap-1 transition-all ${view === 'orders' ? 'text-logo-bordeaux' : 'text-gray-400'}`}
            >
              <Clock size={24} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Commandes</span>
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => { setView('admin'); setView('admin'); }} // Force re-render if needed
              className={`flex flex-col items-center gap-1 transition-all ${view === 'admin' ? 'text-logo-bordeaux' : 'text-gray-400'}`}
            >
              <Bell size={24} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Commandes</span>
            </button>
            <button 
              onClick={() => setView('menu')}
              className={`flex flex-col items-center gap-1 transition-all ${view === 'menu' ? 'text-logo-bordeaux' : 'text-gray-400'}`}
            >
              <MenuIcon size={24} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Menu</span>
            </button>
          </>
        )}
      </nav>
      </div>

      {/* Order Success & Payment QR Modal */}
      <AnimatePresence>
        {lastPlacedOrder && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-logo-text/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="bg-[#10B981] p-6 text-center text-white">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Commande Validée</h3>
                <p className="opacity-90 font-mono">#{lastPlacedOrder.id.slice(-4).toUpperCase()}</p>
              </div>
              
              <div className="p-8 max-h-[75vh] overflow-y-auto no-scrollbar">
                {lastPlacedOrder.paymentMethod === 'paypal' && (
                  <div className="text-center space-y-6">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-4">
                        <img src={paypalLogo} alt="PayPal" className="h-10 object-contain" />
                      </div>
                      <h4 className="font-black text-gray-900 mb-1">Paiement PayPal</h4>
                      <p className="text-xs text-gray-400 mb-6">Paiement sécurisé par compte ou CB</p>
                    </div>

                    <div className="space-y-4">
                      <a 
                        href={`https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=ouazzani9633@gmail.com&item_name=Commande%20GA%20Doner%20${lastPlacedOrder.id.slice(-4).toUpperCase()}&amount=${lastPlacedOrder.total.toFixed(2)}&currency_code=EUR`}
                        target="_blank"
                        rel="no-referrer"
                        className="flex items-center justify-center gap-3 w-full py-5 bg-[#0070ba] text-white rounded-2xl font-black uppercase text-sm shadow-xl shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        Payer {lastPlacedOrder.total.toFixed(2)}€ maintenant
                        <ExternalLink size={20} />
                      </a>
                      
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Destinataire</span>
                          <span className="text-xs font-bold">ouazzani9633@gmail.com</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <ShieldCheck size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {lastPlacedOrder.paymentMethod === 'wero' && (
                  <div className="text-center space-y-6">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-4 shadow-sm">
                        <img src={weroLogo} alt="Wero" className="h-10 object-contain" />
                      </div>
                      <h4 className="font-black text-gray-900 mb-1">Paiement Wero</h4>
                      <p className="text-xs text-gray-400 mb-4 font-medium">Scannez le QR Code ou utilisez le numéro</p>
                    </div>

                    <div className="space-y-4">
                      {/* QR Code Display */}
                      <div className="bg-white border-2 border-blue-100 rounded-3xl p-4 shadow-xl overflow-hidden">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 text-center">Scannez pour payer</p>
                        <img 
                          src={weroQR} 
                          alt="Wero QR Code" 
                          className="w-full aspect-square object-contain rounded-xl"
                        />
                      </div>

                      {/* Number Display with Copy Action */}
                      <div className="bg-blue-600/5 border-2 border-dashed border-blue-200 p-6 rounded-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 bg-blue-100 rounded-bl-xl text-[10px] font-black text-blue-600 uppercase tracking-widest transition-transform group-hover:scale-105">
                          À copier
                        </div>
                        <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest block mb-1 text-left">Numéro du restaurant :</span>
                        <div className="flex items-center justify-center gap-4">
                          <span className="text-2xl font-black text-blue-900 tracking-tighter">07 49 01 81 93</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText('0749018193');
                              notify("Numéro copié !");
                            }}
                            className="p-3 bg-white text-blue-600 rounded-2xl shadow-md border border-blue-100 hover:bg-blue-50 active:scale-95 transition-all"
                          >
                            <Copy size={20} />
                          </button>
                        </div>
                      </div>

                      {/* Redirection Attempt */}
                      <div className="grid grid-cols-1 gap-3">
                        <a 
                          href="https://wero.eu/" 
                          target="_blank"
                          rel="no-referrer"
                          className="flex items-center justify-center gap-3 w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-sm shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          Ouvrir Wero
                          <ExternalLink size={18} />
                        </a>
                      </div>

                      <div className="text-left bg-gray-50 p-5 rounded-2xl space-y-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">Instructions de paiement</p>
                        <div className="flex items-start gap-3 text-xs font-bold text-gray-700">
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0 font-black">1</div>
                          <span>Copiez le numéro ci-dessus</span>
                        </div>
                        <div className="flex items-start gap-3 text-xs font-bold text-gray-700">
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0 font-black">2</div>
                          <span>Dans Wero, saisissez <strong>{lastPlacedOrder.total.toFixed(2)}€</strong></span>
                        </div>
                        <div className="flex items-start gap-3 text-xs font-bold text-gray-700">
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0 font-black">3</div>
                          <span>Validez l'envoi pour confirmer</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {lastPlacedOrder.paymentMethod === 'revolut' && (
                  <div className="text-center space-y-6">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center mb-4">
                        <img src={revolutLogo} alt="Revolut" className="h-10 object-contain rounded-md" />
                      </div>
                      <h4 className="font-black text-gray-900 mb-1">Paiement Revolut</h4>
                      <p className="text-xs text-gray-400 mb-6">Paiement ultra-rapide entre utilisateurs</p>
                    </div>

                    <div className="space-y-4">
                      <a 
                        href={`https://revolut.me/ouazzani9633/${lastPlacedOrder.total.toFixed(2)}`}
                        target="_blank"
                        rel="no-referrer"
                        className="flex items-center justify-center gap-3 w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-sm shadow-xl shadow-gray-500/30 hover:bg-gray-900 transition-all"
                      >
                        Payer {lastPlacedOrder.total.toFixed(2)}€ sur Revolut
                        <ExternalLink size={18} />
                      </a>
                      
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Revolut Username</span>
                          <span className="text-xs font-bold">@ouazzani9633</span>
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText('ouazzani9633');
                            notify("Username copié !");
                          }}
                          className="p-2 text-gray-400 hover:text-black"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {lastPlacedOrder.paymentMethod === 'counter' && (
                  <div className="text-center py-6">
                    <p className="text-gray-600 mb-8 leading-relaxed">
                      Votre commande est transmise !<br/>
                      Vous réglerez directement <span className="font-bold text-logo-bordeaux">au comptoir</span> lors du retrait.
                    </p>
                    <div className="w-48 h-48 bg-gray-50 rounded-3xl mx-auto flex items-center justify-center border border-gray-100">
                      <UtensilsCrossed size={64} className="text-gray-200" />
                    </div>
                  </div>
                )}

                {lastPlacedOrder.paymentMethod !== 'counter' && !isPaymentConfirmed && (
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center mb-4 italic">
                      Étape finale obligatoire :
                    </p>
                    <button 
                      onClick={confirmPaymentAndNotify}
                      className="w-full py-5 bg-logo-cream text-logo-text rounded-2xl font-black uppercase text-sm shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                      J'ai payé la commande
                      <CheckCircle size={20} className="text-logo-bordeaux" />
                    </button>
                    <p className="mt-3 text-[10px] text-gray-400 text-center px-4 leading-relaxed">
                      En cliquant ici, une notification SMS de paiement sera préparée pour le restaurant.
                    </p>
                  </div>
                )}

                {(lastPlacedOrder.paymentMethod === 'counter' || isPaymentConfirmed) && (
                  <Button 
                    onClick={() => { setLastPlacedOrder(null); setView('orders'); }}
                    className="w-full mt-8 py-4 font-black uppercase tracking-widest rounded-2xl shadow-lg"
                  >
                    C'est compris !
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {showNotification && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-6 right-6 z-50"
          >
            <div className={`p-4 rounded-2xl shadow-2xl flex items-center gap-3 ${
              showNotification.type === 'success' ? 'bg-logo-text text-white' : 'bg-red-500 text-white'
            }`}>
              {showNotification.type === 'success' ? <CheckCircle size={20} className="text-logo-cream" /> : <X size={20} />}
              <p className="font-medium text-sm">{showNotification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

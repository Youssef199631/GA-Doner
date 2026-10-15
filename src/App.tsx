import { useState, useEffect, useMemo } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp, where } from 'firebase/firestore';
import { MenuItem, UserProfile, Order, OrderItem, Category, OrderStatus, PaymentMethod, PickupTime, KebabOptions } from './types';
import { INITIAL_MENU, MENU_DATA_MAP } from './data/menu';
import { KebabCustomizerModal } from './components/KebabCustomizerModal';
import { OrderCountdownCard } from './components/OrderCountdownCard';
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
  ChevronLeft,
  ChevronRight,
  Menu as MenuIcon,
  X,
  Bell,
  BellRing,
  UtensilsCrossed,
  QrCode,
  Smartphone,
  CreditCard,
  Copy,
  ExternalLink,
  ShieldCheck,
  Mail,
  Lock,
  Sparkles,
  Flame,
  Eye
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
    primary: "bg-logo-cream text-logo-text hover:brightness-105 shadow-sm border border-logo-cream/50",
    secondary: "bg-white text-logo-text border border-logo-text hover:bg-logo-cream",
    ghost: "bg-transparent text-logo-text hover:bg-white/10",
    outline: "bg-transparent text-logo-bordeaux border border-logo-bordeaux hover:bg-logo-bordeaux/10",
    dark: "bg-logo-text text-white hover:opacity-90",
    bordeaux: "bg-logo-bordeaux text-white hover:brightness-110 shadow-sm"
  };
  
  const hasCustomBg = className.includes('bg-');
  const variantClass = hasCustomBg ? '' : (variants[variant] || variants.primary);

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyles} ${variantClass} ${className}`}
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

// Helper to detect kebab dishes that require sauces, crudites and supplements customization
export const isKebabItem = (item?: MenuItem | { name: string; category?: string } | null): boolean => {
  if (!item) return false;
  const name = (item.name || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();
  return cat === 'kebab' || name.includes('kebab') || name.includes('döner') || name.includes('doner');
};

// Pleasant restaurant audio chime using Web Audio API (reliable and self-contained)
export const playChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const playNote = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    playNote(587.33, 0, 0.25); // D5
    playNote(880.00, 0.15, 0.35); // A5
    playNote(1174.66, 0.32, 0.55); // D6
  } catch (e) {
    console.warn("Audio chime error:", e);
  }
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
  const [customizingKebab, setCustomizingKebab] = useState<MenuItem | null>(null);
  const [orderReadyAlertOrder, setOrderReadyAlertOrder] = useState<Order | null>(null);
  const [newItem, setNewItem] = useState<{name: string, description: string, price: string, category: Category, image: string}>({
    name: '',
    description: '',
    price: '',
    category: 'Plats',
    image: ''
  });
  const [selectedImageModal, setSelectedImageModal] = useState<{ 
    urls?: string[]; 
    currentIndex?: number; 
    url?: string; 
    title: string; 
    description?: string; 
  } | null>(null);
  const [cardImageIndices, setCardImageIndices] = useState<Record<string, number>>({});
  const [editingPrices, setEditingPrices] = useState<{[key: string]: string}>({});
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showNotification, setShowNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showNav, setShowNav] = useState(true);
  
  // Auth State
  const [authMode, setAuthMode] = useState<'landing' | 'login' | 'register' | 'forgot'>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isOtpLoading, setIsOtpLoading] = useState(false);

  // Handle Scroll to hide/show Nav
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowNav(false);
      } else {
        setShowNav(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);



  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("[AUTH] State change detected:", firebaseUser?.uid);
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          console.log("[AUTH] Fetching profile for:", firebaseUser.uid);
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const adminEmails = ['ouazzani9633@gmail.com', 'sosdepannage54@gmail.com'];
          
          const userEmail = firebaseUser.email?.toLowerCase() || '';
          
          const isOwner = adminEmails.some(o => o.toLowerCase() === userEmail);
          console.log("[AUTH] User is admin:", isOwner);

          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            console.log("[AUTH] Profile found:", userData.role);
            
            if (isOwner && userData.role !== 'owner') {
              userData.role = 'owner';
              await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'owner' });
              console.log("[AUTH] Upgraded to owner role");
            }
            
            setProfile(userData);
          } else {
            console.log("[AUTH] Profile NOT found, creating one...");
            const phoneFromUid = firebaseUser.uid.startsWith('+') ? firebaseUser.uid : (firebaseUser.phoneNumber || '');

            const defaultName = firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Utilisateur';

            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              phoneNumber: firebaseUser.phoneNumber || phoneFromUid,
              displayName: firebaseUser.displayName || firebaseUser.phoneNumber || phoneFromUid || defaultName,
              loyaltyPoints: 0,
              role: isOwner ? 'owner' : 'customer'
            };
            
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), newProfile as any);
              console.log("[AUTH] New profile created");
              setProfile(newProfile);
            } catch (err) {
              console.error("[AUTH] Profile creation failed:", err);
              setProfile(newProfile);
              notify("Profil temporaire actif (Erreur synchronisation)", "error");
            }
          }
        } catch (error) {
          console.error("[AUTH] Auth state update error:", error);
          notify("Erreur lors de la récupération du profil", "error");
        }
      } else {
        console.log("[AUTH] No user logged in");
        setProfile(null);
        if (view === 'admin' || view === 'profile' || view === 'orders') {
          setView('menu');
        }
      }
      console.log("[AUTH] Marking auth as ready");
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Menu Listener
  useEffect(() => {
    let isSeeding = false;
    const unsubscribe = onSnapshot(collection(db, 'menu'), (snapshot) => {
      const menuData = snapshot.docs.map(doc => {
        const d = doc.data() as MenuItem;
        const fallback = MENU_DATA_MAP[d.name];
        const imagesList = (d.images && d.images.length > 0) 
          ? d.images 
          : (fallback?.images && fallback.images.length > 0)
            ? fallback.images
            : (d.image ? [d.image] : (fallback?.image ? [fallback.image] : []));
        return { 
          id: doc.id, 
          ...d,
          image: d.image || fallback?.image,
          images: imagesList,
          description: d.description || fallback?.description
        } as MenuItem;
      });
      
      // Cleanup specifically requested 'dddd' items that the user can't delete manually
      const itemsToDelete = menuData.filter(item => item.name.toLowerCase().includes('dddd'));
      if (itemsToDelete.length > 0 && profile?.role === 'owner') {
        itemsToDelete.forEach(item => {
          deleteDoc(doc(db, 'menu', item.id));
        });
      }

      setMenu(menuData.filter(item => !item.name.toLowerCase().includes('dddd')));

      // Auto-sync images and descriptions to Firestore if owner is connected and fields are missing/outdated
      if (profile?.role === 'owner') {
        snapshot.docs.forEach(docSnap => {
          const d = docSnap.data() as MenuItem;
          const fallback = MENU_DATA_MAP[d.name];
          if (fallback) {
            const hasNewImages = fallback.images && (!d.images || d.images.length !== fallback.images.length);
            const needsImage = !d.image && fallback.image;
            const needsDesc = fallback.description && !d.description;
            if (hasNewImages || needsImage || needsDesc) {
              updateDoc(doc(db, 'menu', docSnap.id), {
                image: fallback.image,
                images: fallback.images || (fallback.image ? [fallback.image] : []),
                ...(needsDesc ? { description: fallback.description } : {})
              }).catch(e => console.warn('Could not auto-sync image for', d.name, e));
            }
          }
        });
      }
      
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
      
      // Check for orders status changes and prep time adjustments
      if (profile.role === 'customer') {
        ordersData.forEach(o => {
          const prev = orders.find(x => x.id === o.id);
          if (prev) {
            // Check if status transitioned to ready
            if (prev.status !== 'ready' && o.status === 'ready') {
              playChime();
              setOrderReadyAlertOrder(o);
              notify(`🎉 Commande #${o.id.slice(-4).toUpperCase()} prête ! Venez la retirer au comptoir.`, 'success');
            } else if ((o.extraMinutes || 0) > (prev.extraMinutes || 0)) {
              const diff = (o.extraMinutes || 0) - (prev.extraMinutes || 0);
              notify(`⏱️ Le chef a prolongé le temps de préparation (+${diff} min)`, 'success');
            } else if (prev.status !== o.status) {
              notify(`Statut commande #${o.id.slice(-4).toUpperCase()} : ${o.status === 'validated' ? 'En préparation' : o.status === 'completed' ? 'Terminée' : o.status}`);
            }
          }
        });
      } else if (profile.role === 'owner') {
        const newOrders = ordersData.filter(o => o.status === 'pending');
        if (newOrders.length > orders.filter(o => o.status === 'pending').length) {
          playChime();
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

  const loginWithEmail = async (e: any) => {
    e.preventDefault();
    if (!email || !password) {
      notify("Veuillez remplir tous les champs", "error");
      return;
    }
    setIsOtpLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      notify("Connexion réussie !", "success");
    } catch (error: any) {
      console.error("Email login error:", error);
      let msg = "Identifiants invalides";
      if (error.code === 'auth/user-not-found') msg = "Utilisateur non trouvé";
      if (error.code === 'auth/wrong-password') msg = "Mot de passe incorrect";
      notify(msg, "error");
    } finally {
      setIsOtpLoading(false);
    }
  };

  const registerWithEmail = async (e: any) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      notify("Veuillez remplir tous les champs", "error");
      return;
    }
    if (password !== confirmPassword) {
      notify("Les mots de passe ne correspondent pas", "error");
      return;
    }
    if (password.length < 6) {
      notify("Le mot de passe doit faire au moins 6 caractères", "error");
      return;
    }
    setIsOtpLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      notify("Compte créé avec succès !", "success");
    } catch (error: any) {
      console.error("Email registration error:", error);
      let msg = "Erreur lors de l'inscription";
      if (error.code === 'auth/email-already-in-use') msg = "Cet email est déjà utilisé";
      if (error.code === 'auth/invalid-email') msg = "Email invalide";
      notify(msg, "error");
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleForgotPassword = async (e: any) => {
    e.preventDefault();
    if (!email) {
      notify("Veuillez entrer votre adresse email", "error");
      return;
    }
    setIsOtpLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      notify("Email de réinitialisation envoyé ! Vérifiez vos spams s'il n'apparaît pas.", "success");
      setAuthMode('login');
    } catch (error: any) {
      console.error("Forgot password error:", error);
      let msg = "Une erreur est survenue lors de l'envoi de l'email";
      if (error.code === 'auth/user-not-found') msg = "Aucun utilisateur trouvé avec cet email";
      if (error.code === 'auth/invalid-email') msg = "Format d'email invalide";
      notify(msg, "error");
    } finally {
      setIsOtpLoading(false);
    }
  };

  const logout = () => signOut(auth);

  const addToCart = (
    item: MenuItem,
    customization?: {
      kebabOptions: KebabOptions;
      totalPrice: number;
      comment: string;
      quantity?: number;
    }
  ) => {
    if (customization) {
      const qty = customization.quantity || 1;
      const unitPrice = customization.totalPrice / qty;
      const existingIdx = cart.findIndex(
        i => i.menuItemId === item.id && i.comment === customization.comment
      );
      if (existingIdx >= 0) {
        setCart(cart.map((i, idx) => idx === existingIdx ? { ...i, quantity: i.quantity + qty } : i));
      } else {
        setCart([
          ...cart,
          {
            menuItemId: item.id,
            name: item.name,
            price: unitPrice,
            basePrice: item.price,
            quantity: qty,
            comment: customization.comment,
            kebabOptions: customization.kebabOptions,
          },
        ]);
      }
      notify(`${item.name} personnalisé ajouté au panier`);
    } else {
      const existingIdx = cart.findIndex(i => i.menuItemId === item.id && !i.kebabOptions);
      if (existingIdx >= 0) {
        setCart(cart.map((i, idx) => idx === existingIdx ? { ...i, quantity: i.quantity + 1 } : i));
      } else {
        setCart([...cart, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, comment: '' }]);
      }
      notify(`${item.name} ajouté au panier`);
    }
  };

  const updateCartQuantity = (targetIndex: number, delta: number) => {
    setCart(cart.map((i, idx) => {
      if (idx === targetIndex) {
        const newQty = Math.max(0, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const updateCartComment = (targetIndex: number, comment: string) => {
    setCart(cart.map((i, idx) => idx === targetIndex ? { ...i, comment } : i));
  };

  const totalCart = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const setExactOrderPrepTime = async (orderId: string, exactMinutes: number) => {
    try {
      const targetMs = Date.now() + exactMinutes * 60 * 1000;
      await updateDoc(doc(db, 'orders', orderId), {
        estimatedMinutes: exactMinutes,
        extraMinutes: 0,
        targetReadyAt: new Date(targetMs)
      });
      notify(`Temps de préparation réglé à ${exactMinutes} min`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    }
  };

  const extendOrderPrepTime = async (orderId: string, additionalMinutes: number) => {
    try {
      const targetOrder = orders.find(o => o.id === orderId);
      const currentExtra = (targetOrder?.extraMinutes || 0) + additionalMinutes;

      let currentTargetMs: number;
      if (targetOrder?.targetReadyAt?.toDate) {
        currentTargetMs = targetOrder.targetReadyAt.toDate().getTime();
      } else if (targetOrder?.targetReadyAt?.seconds) {
        currentTargetMs = targetOrder.targetReadyAt.seconds * 1000;
      } else if (typeof targetOrder?.targetReadyAt === 'number') {
        currentTargetMs = targetOrder.targetReadyAt;
      } else if (targetOrder?.createdAt?.toDate) {
        currentTargetMs = targetOrder.createdAt.toDate().getTime() + ((targetOrder.estimatedMinutes || 20) + (targetOrder.extraMinutes || 0)) * 60 * 1000;
      } else {
        currentTargetMs = Date.now();
      }

      const baseMs = Math.max(Date.now(), currentTargetMs);
      const newTargetMs = baseMs + additionalMinutes * 60 * 1000;

      await updateDoc(doc(db, 'orders', orderId), {
        extraMinutes: currentExtra,
        targetReadyAt: new Date(newTargetMs)
      });
      notify(`+${additionalMinutes} min ajoutées à la commande #${orderId.slice(-4).toUpperCase()}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    }
  };

  const generateOrderSMS = (order: Order) => {
    if (!order.items || order.items.length === 0) {
      return "ERREUR : Contenu de la commande vide.";
    }

    const itemsList = order.items.map(item => {
      let itemStr = `- ${item.quantity}x ${item.name}`;
      if (item.comment) itemStr += ` (${item.comment})`;
      return itemStr;
    }).join('\n');

    const paymentLabels = {
      'counter': 'Comptoir',
      'paypal': 'Paypal',
      'wero': 'Wero',
      'revolut': 'Revolut'
    };

    const paymentLabel = paymentLabels[order.paymentMethod] || order.paymentMethod;
    const pickupLabel = order.pickupTime === 'now' ? 'ASAP' : 
                        order.pickupTime === '20min' ? '20 min' : '1h';
    
    return `GA DONER GRILL\n` +
           `Client: ${order.customerName}\n` +
           `ID: #${order.id.slice(-4).toUpperCase()}\n` +
           `Pay: ${paymentLabel}\n` +
           `Retrait: ${pickupLabel}\n\n` +
           `PRODUITS:\n${itemsList}\n\n` +
           `TOTAL: ${order.total.toFixed(2)}€\n` +
           `Merci !`;
  };

  const stripUndefinedFields = <T,>(obj: T): T => {
    if (obj === null || obj === undefined) return null as unknown as T;
    if (obj instanceof Date) return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => stripUndefinedFields(item)).filter(item => item !== undefined) as unknown as T;
    }
    if (typeof obj === 'object') {
      if (obj && typeof obj === 'object' && ('_methodName' in obj || (obj as any).constructor?.name === 'FieldValue')) {
        return obj;
      }
      const clean: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          const cleanedVal = stripUndefinedFields(value);
          if (cleanedVal !== undefined) {
            clean[key] = cleanedVal;
          }
        }
      }
      return clean as unknown as T;
    }
    return obj;
  };

  const placeOrder = async () => {
    if (!user || cart.length === 0) return;

    // Always 20 minutes countdown by default as requested
    const defaultPrepMinutes = 20;
    const nowMs = Date.now();
    const targetReadyAt = new Date(nowMs + defaultPrepMinutes * 60 * 1000);

    const sanitizedItems = cart.map(item => {
      const sanitized: any = {
        menuItemId: item.menuItemId || '',
        name: item.name || '',
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        comment: item.comment || '',
      };
      if (typeof item.basePrice === 'number') {
        sanitized.basePrice = item.basePrice;
      }
      if (item.kebabOptions) {
        const ko: any = {
          crudites: Array.isArray(item.kebabOptions.crudites) ? item.kebabOptions.crudites : [],
          sauces: Array.isArray(item.kebabOptions.sauces) ? item.kebabOptions.sauces : [],
          supplements: Array.isArray(item.kebabOptions.supplements)
            ? item.kebabOptions.supplements.map(s => ({
                name: s.name,
                price: Number(s.price) || 0
              }))
            : []
        };
        if (item.kebabOptions.specialNote && item.kebabOptions.specialNote.trim()) {
          ko.specialNote = item.kebabOptions.specialNote.trim();
        }
        sanitized.kebabOptions = ko;
      }
      return sanitized;
    });

    const rawOrder: Omit<Order, 'id'> = {
      userId: user.uid,
      items: sanitizedItems,
      total: Number(totalCart.toFixed(2)),
      status: 'pending',
      paymentMethod: paymentMethod,
      pickupTime: pickupTime || '20min',
      createdAt: serverTimestamp(),
      estimatedMinutes: defaultPrepMinutes,
      extraMinutes: 0,
      targetReadyAt: targetReadyAt,
      pointsEarned: Math.floor(totalCart),
      customerName: user.displayName || user.phoneNumber || 'Client',
      customerEmail: user.email || user.phoneNumber || 'Pas d\'email'
    };

    const newOrder = stripUndefinedFields(rawOrder);

    try {
      const docRef = await addDoc(collection(db, 'orders'), newOrder);
      const orderId = docRef.id;
      
      const orderWithId = { ...newOrder, id: orderId } as Order;
      setLastPlacedOrder(orderWithId);
      setIsPaymentConfirmed(false);

      // Update loyalty points
      if (profile) {
        await updateDoc(doc(db, 'users', user.uid), {
          loyaltyPoints: profile.loyaltyPoints + newOrder.pointsEarned
        });
      }

      // Notification system (Server-side Twilio)
      try {
        const response = await fetch('/api/send-order-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order: orderWithId,
            customerEmail: user.email
          })
        });
        
        const result = await response.json();
        console.log('[NOTIFY] Result:', result);
        
        if (result.smsSent) {
          notify("Confirmation envoyée au restaurant !", "success");
        }
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
      notify("Paiement initié ! Le restaurant a été notifié.");
      
      // Still trigger the server notify if for some reason it wasn't enough on first attempt
      fetch('/api/send-order-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: lastPlacedOrder,
          customerEmail: user?.email
        })
      }).catch(console.error);
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
        price: parseFloat(newItem.price),
        image: newItem.image || MENU_DATA_MAP[newItem.name]?.image || ''
      });
      notify(`${newItem.name} ajouté au menu !`);
      setNewItem({ name: '', description: '', price: '', category: 'Plats', image: '' });
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
            className="w-32 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center p-3"
          >
            <img src={logo} alt="Loading" className="w-full h-full object-contain" />
          </motion.div>
          <p className="text-gray-500 font-medium">Chargement de GA Döner & Grill...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authMode === 'landing') {
      return (
        <div 
          className="min-h-screen bg-logo-bordeaux flex flex-col items-center justify-center p-6 text-center bg-cover bg-center bg-no-repeat relative overflow-hidden"
          style={{ backgroundImage: `linear-gradient(rgba(97, 8, 7, 0.8), rgba(97, 8, 7, 0.8)), url(${backgroundImage})` }}
        >
          {/* Subtle moving background overlay */}
          <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/40 pointer-events-none" />

          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { 
                opacity: 1,
                transition: { 
                  staggerChildren: 0.4,
                  delayChildren: 0.1
                } 
              }
            }}
            className="max-w-md w-full flex flex-col items-center justify-center relative z-10 px-4"
          >
            {/* Logo container with gorgeous spring scale up, bounce and glowing ring */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, scale: 0.6, y: -25 },
                visible: { 
                  opacity: 1, 
                  scale: 1, 
                  y: 0,
                  transition: { 
                    type: "spring",
                    stiffness: 90,
                    damping: 14,
                    duration: 1.0
                  } 
                }
              }}
              className="w-64 h-36 sm:w-72 sm:h-40 bg-white rounded-[2.5rem] flex items-center justify-center shadow-2xl p-5 border-4 border-logo-cream/30 mb-8 relative"
            >
              <motion.div 
                className="absolute inset-0 rounded-[2.5rem] bg-logo-cream/10"
                animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              />
              <img src={logo} alt="GA Döner & Grill Logo" className="w-full h-full object-contain relative z-10" />
            </motion.div>

            {/* Restaurant Brand Title */}
            <motion.h1 
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { 
                  opacity: 1, 
                  y: 0,
                  transition: { duration: 0.7, ease: "easeOut" }
                }
              }}
              className="text-4xl font-black text-white tracking-wider uppercase mb-3 drop-shadow-lg font-sans"
            >
              GA Döner & Grill
            </motion.h1>

            {/* Catchy Slogan Phrase */}
            <motion.p 
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { 
                  opacity: 1, 
                  y: 0,
                  transition: { duration: 0.7, ease: "easeOut" }
                }
              }}
              className="text-logo-cream text-xl sm:text-2xl font-bold max-w-sm mx-auto mb-4 italic leading-relaxed drop-shadow"
            >
              "Le goût authentique du grill traditionnel & döners faits maison"
            </motion.p>

            {/* Sub description */}
            <motion.p 
              variants={{
                hidden: { opacity: 0 },
                visible: { 
                  opacity: 0.85,
                  transition: { duration: 0.7 }
                }
              }}
              className="text-white/80 text-sm max-w-sm mx-auto mb-10 leading-relaxed font-medium"
            >
              Découvrez notre cuisine artisanale, commandez en ligne et cumulez des points de fidélité ! 🎁
            </motion.p>

            {/* Interaction Call to Action */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { 
                  opacity: 1, 
                  y: 0,
                  transition: { duration: 0.7, ease: "easeOut" }
                }
              }}
              className="w-full space-y-4"
            >
              <Button 
                onClick={() => setAuthMode('login')} 
                className="w-full py-3 sm:py-4 text-base sm:text-lg font-extrabold uppercase tracking-widest shadow-xl bg-logo-cream text-logo-text hover:brightness-105 active:scale-95 transition-all"
              >
                Se connecter
              </Button>
              
              <button 
                onClick={() => setAuthMode('register')} 
                className="w-full py-3 sm:py-4 text-base sm:text-lg font-extrabold uppercase tracking-widest border-2 border-white/50 text-white rounded-2xl hover:bg-white/10 active:scale-95 transition-all animate-none"
              >
                S'inscrire
              </button>
            </motion.div>

            {/* Loyalty point highlights */}
            <motion.div 
              variants={{
                hidden: { opacity: 0 },
                visible: { 
                  opacity: 1,
                  transition: { delay: 1.0, duration: 0.7 }
                }
              }}
              className="mt-8 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs font-semibold text-logo-cream/90 flex items-center gap-2"
            >
              <Star size={14} fill="currentColor" />
              <span>1€ dépensé = 1 point fidélité</span>
            </motion.div>
          </motion.div>
        </div>
      );
    }

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
          <div className="w-36 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-md p-3 border border-gray-50">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black text-logo-text mb-2 uppercase tracking-tight">
            {authMode === 'login' ? "Connexion" : authMode === 'register' ? "Inscription" : "Récupération"}
          </h1>
          <p className="text-gray-500 mb-6 leading-relaxed text-sm">
            {authMode === 'login' && "Entrez vos identifiants pour accéder à votre espace."}
            {authMode === 'register' && "Créez votre compte pour commencer à cumuler vos points."}
            {authMode === 'forgot' && "Saisissez votre email pour réinitialiser votre mot de passe."}
          </p>
          
          {authMode === 'forgot' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="Adresse email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-logo-bordeaux/20 outline-none text-logo-text font-medium"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail size={20} />
                </div>
              </div>
              <Button type="submit" className="w-full py-3 sm:py-4 text-base sm:text-lg font-bold" disabled={isOtpLoading}>
                {isOtpLoading ? "Envoi en cours..." : "Réinitialiser le mot de passe"}
              </Button>
              <button 
                type="button"
                onClick={() => setAuthMode('login')}
                className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-logo-bordeaux transition-colors mt-4 block mx-auto"
              >
                Retour à la connexion
              </button>
            </form>
          ) : (
            <form onSubmit={authMode === 'login' ? loginWithEmail : registerWithEmail} className="space-y-4">
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="Email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-logo-bordeaux/20 outline-none text-logo-text font-medium"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail size={20} />
                </div>
              </div>
              <div className="relative">
                <input 
                  type="password" 
                  placeholder="Mot de passe" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-logo-bordeaux/20 outline-none text-logo-text font-medium"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock size={20} />
                </div>
              </div>
              {authMode === 'login' && (
                <div className="text-right">
                  <button 
                    type="button" 
                    onClick={() => setAuthMode('forgot')}
                    className="text-xs font-bold text-gray-400 hover:text-logo-bordeaux transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              )}
              {authMode === 'register' && (
                <div className="relative">
                  <input 
                    type="password" 
                    placeholder="Confirmer le mot de passe" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-logo-bordeaux/20 outline-none text-logo-text font-medium"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock size={20} />
                  </div>
                </div>
              )}
              <Button type="submit" className="w-full py-3 sm:py-4 text-base sm:text-lg font-bold" disabled={isOtpLoading}>
                {isOtpLoading ? "Chargement..." : authMode === 'login' ? "Se connecter" : "S'inscrire"}
              </Button>
              <div className="flex flex-col gap-2 mt-4">
                <button 
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-logo-bordeaux transition-colors block mx-auto"
                >
                  {authMode === 'login' ? "Créer un compte" : "Déjà un compte ? Se connecter"}
                </button>
                <button 
                  type="button"
                  onClick={() => setAuthMode('landing')}
                  className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-logo-bordeaux transition-colors block mx-auto"
                >
                  ← Retour à l'accueil
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen w-full bg-logo-bordeaux text-white font-sans relative"
      style={{ 
        backgroundImage: `linear-gradient(rgba(97, 8, 7, 0.6), rgba(97, 8, 7, 0.7)), url(${backgroundImage})`,
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 100px)'
      }}
    >
      <div className="relative z-10 min-h-screen flex flex-col w-full">
        {/* Simple Points Indicator for Customers */}
        {profile?.role === 'customer' && (
          <div 
            className="fixed right-4 z-40" 
            style={{ top: 'calc(env(safe-area-inset-top) + 20px)' }}
          >
             <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-gray-100 flex items-center gap-2 text-logo-bordeaux font-bold text-xs ring-1 ring-black/5">
                <Star size={14} fill="currentColor" />
                <span>{profile.loyaltyPoints} pts</span>
             </div>
          </div>
        )}

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
                  className="w-48 h-28 rounded-3xl bg-white shadow-xl flex items-center justify-center p-3 border border-gray-50 mb-4"
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
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {menu.filter(item => item.category === activeCategory).map(item => {
                  const fallbackData = MENU_DATA_MAP[item.name];
                  const itemDesc = item.description || fallbackData?.description;
                  const itemImages: string[] = (item.images && item.images.length > 0)
                    ? item.images
                    : (fallbackData?.images && fallbackData.images.length > 0)
                      ? fallbackData.images
                      : (item.image ? [item.image] : (fallbackData?.image ? [fallbackData.image] : []));
                  const currentIdx = (cardImageIndices[item.id] || 0) % (itemImages.length || 1);
                  const activeImage = itemImages[currentIdx] || item.image || fallbackData?.image;
                  const hasMultiple = itemImages.length > 1;

                  return (
                    <motion.div 
                      layout
                      key={item.id}
                      className="bg-white rounded-3xl shadow-sm hover:shadow-lg border border-gray-100 flex flex-col justify-between overflow-hidden group text-logo-text transition-all duration-300"
                    >
                      {activeImage && (
                        <div 
                          className="w-full h-48 sm:h-52 overflow-hidden bg-gray-100 relative cursor-pointer group/img select-none"
                          onClick={() => setSelectedImageModal({ 
                            urls: itemImages, 
                            currentIndex: currentIdx, 
                            title: item.name, 
                            description: itemDesc 
                          })}
                        >
                          <img 
                            src={activeImage} 
                            alt={item.name} 
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />

                          {/* Photo badges */}
                          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md z-10">
                            <Sparkles size={11} className="text-yellow-400" />
                            <span>Photo GA</span>
                          </div>

                          {hasMultiple && (
                            <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md z-10 border border-white/10">
                              <span>{currentIdx + 1}/{itemImages.length} photos</span>
                            </div>
                          )}

                          {/* Navigation arrows if multiple images */}
                          {hasMultiple && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCardImageIndices(prev => ({
                                    ...prev,
                                    [item.id]: (currentIdx - 1 + itemImages.length) % itemImages.length
                                  }));
                                }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-sm z-20 shadow-md transition-all active:scale-90"
                                title="Photo précédente"
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCardImageIndices(prev => ({
                                    ...prev,
                                    [item.id]: (currentIdx + 1) % itemImages.length
                                  }));
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-sm z-20 shadow-md transition-all active:scale-90"
                                title="Photo suivante"
                              >
                                <ChevronRight size={16} />
                              </button>

                              {/* Dot indicators */}
                              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-sm">
                                {itemImages.map((_, dotIdx) => (
                                  <button
                                    key={dotIdx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCardImageIndices(prev => ({ ...prev, [item.id]: dotIdx }));
                                    }}
                                    className={`h-1.5 rounded-full transition-all ${dotIdx === currentIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
                                  />
                                ))}
                              </div>
                            </>
                          )}

                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <span className="bg-white/95 text-logo-text text-xs font-bold px-3 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 backdrop-blur-sm">
                              <Eye size={14} /> Voir en grand
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                        <div 
                          className="cursor-pointer group/title"
                          onClick={() => setSelectedImageModal({ 
                            urls: itemImages, 
                            currentIndex: currentIdx, 
                            title: item.name, 
                            description: itemDesc 
                          })}
                        >
                          <h3 className="font-extrabold text-base sm:text-lg text-logo-text leading-tight group-hover/title:text-logo-bordeaux transition-colors">
                            {item.name}
                          </h3>
                          {itemDesc && (
                            <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed font-medium">
                              {itemDesc}
                            </p>
                          )}
                        </div>
                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                          <p className="text-logo-bordeaux font-black text-lg sm:text-xl tabular-nums">
                            {item.price.toFixed(2)}€
                          </p>
                          <div className="flex items-center gap-2">
                            {profile?.role === 'owner' && (
                              <button 
                                onClick={() => {
                                  deleteDoc(doc(db, 'menu', item.id))
                                    .then(() => notify(`${item.name} supprimé`))
                                    .catch(e => handleFirestoreError(e, OperationType.DELETE, 'menu'));
                                }}
                                className="w-9 h-9 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                                title="Supprimer"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                            <button 
                              type="button"
                              onClick={() => {
                                if (isKebabItem(item)) {
                                  setCustomizingKebab(item);
                                } else {
                                  addToCart(item);
                                }
                              }}
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full shadow-md active:scale-90 bg-logo-cream text-logo-text hover:brightness-105 hover:scale-105 transition-all flex items-center justify-center border border-logo-cream cursor-pointer"
                              title={isKebabItem(item) ? "Personnaliser sauces, crudités & suppléments" : "Ajouter au panier"}
                            >
                              <Plus size={18} strokeWidth={2.5} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
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
              <div className="flex items-center justify-end mb-4 sm:mb-8 shrink-0">
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
                      {cart.map((item, idx) => {
                        const itemImage = MENU_DATA_MAP[item.name]?.image;
                        return (
                        <div key={idx} className="flex flex-col gap-3 p-4 sm:p-5 bg-gray-50/50 rounded-[1.5rem] border border-gray-100 group transition-all hover:bg-white hover:shadow-lg">
                          <div className="flex justify-between items-start gap-3">
                            {itemImage && (
                              <img 
                                src={itemImage} 
                                alt={item.name} 
                                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover shrink-0 border border-gray-200 shadow-sm"
                              />
                            )}
                            <div className="flex-1 pr-2 sm:pr-4">
                              <h4 className="font-black text-base sm:text-lg text-logo-text leading-tight group-hover:text-logo-bordeaux transition-colors">{item.name}</h4>
                              <p className="text-logo-bordeaux font-black text-sm sm:text-base mt-0.5 sm:mt-1">{(item.price * item.quantity).toFixed(2)}€</p>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-4 bg-white p-1 rounded-2xl shadow-sm border border-gray-100 shrink-0">
                              <button 
                                onClick={() => updateCartQuantity(idx, -1)}
                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Minus size={16} className="sm:w-5 sm:h-5" />
                              </button>
                              <span className="font-black text-sm sm:text-lg w-5 sm:w-6 text-center text-logo-text">{item.quantity}</span>
                              <button 
                                onClick={() => updateCartQuantity(idx, 1)}
                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-logo-bordeaux hover:scale-110 transition-transform"
                              >
                                <Plus size={16} className="sm:w-5 sm:h-5" />
                              </button>
                            </div>
                          </div>

                          {/* Kebab Options display in Cart */}
                          {item.kebabOptions && (
                            <div className="bg-white p-3 rounded-2xl border border-gray-100 space-y-1.5 text-xs shadow-xs">
                              {item.kebabOptions.sauces && item.kebabOptions.sauces.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-gray-500 text-[11px]">Sauces :</span>
                                  {item.kebabOptions.sauces.map(s => (
                                    <span key={s} className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-md text-[10px]">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {item.kebabOptions.crudites && item.kebabOptions.crudites.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-gray-500 text-[11px]">Crudités :</span>
                                  {item.kebabOptions.crudites.map(c => (
                                    <span key={c} className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-md text-[10px]">
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {item.kebabOptions.supplements && item.kebabOptions.supplements.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-logo-bordeaux text-[11px]">Suppléments :</span>
                                  {item.kebabOptions.supplements.map(supp => (
                                    <span key={supp.name} className="bg-logo-cream/70 text-logo-text font-black px-2 py-0.5 rounded-md text-[10px]">
                                      +{supp.name} ({supp.price.toFixed(2)}€)
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder="Instructions spéciales..." 
                              value={item.comment}
                              onChange={(e) => updateCartComment(idx, e.target.value)}
                              className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-2 sm:py-3 text-[11px] sm:text-sm text-logo-text focus:ring-2 focus:ring-logo-bordeaux/20 outline-none transition-all italic shadow-inner"
                            />
                          </div>
                        </div>
                        );
                      })}
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
                        <h3 className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3 sm:mb-4 px-2">Mode de paiement</h3>
                        <div className="bg-logo-bordeaux/5 border-2 border-logo-bordeaux rounded-[1.25rem] p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-logo-bordeaux text-white flex items-center justify-center shrink-0 shadow-sm">
                            <Smartphone size={20} />
                          </div>
                          <div>
                            <span className="text-xs font-black text-logo-text uppercase tracking-tight block">Paiement immédiat au comptoir</span>
                            <span className="text-[11px] text-gray-500 font-semibold">Règlement en espèces ou carte bancaire lors du retrait au restaurant</span>
                          </div>
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
              className="max-w-4xl mx-auto w-full pt-4"
            >
              {orders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
                  <Clock size={48} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-500 font-medium">Aucune commande pour le moment.</p>
                  <Button onClick={() => setView('menu')} className="mt-6">Commander maintenant</Button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 text-logo-text">
                  {orders.map(order => (
                    <OrderCountdownCard key={order.id} order={order} />
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
                          <OrderCountdownCard
                            key={order.id}
                            order={order}
                            isOwner={true}
                            onExtendPrepTime={extendOrderPrepTime}
                            onSetExactPrepTime={setExactOrderPrepTime}
                            onSetStatus={updateOrderStatus}
                          />
                        ))
                      )}
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
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Image (URL ou chemin /menu/... - optionnel)</label>
                          <input 
                            type="text" 
                            value={newItem.image}
                            onChange={e => setNewItem({...newItem, image: e.target.value})}
                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-logo-bordeaux/20 text-logo-text"
                            placeholder="ex: /menu/assiette-ga.png"
                          />
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
                            {catItems.map(item => {
                              const itemImg = item.image || MENU_DATA_MAP[item.name]?.image;
                              return (
                              <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group text-logo-text gap-3">
                                {itemImg && (
                                  <img 
                                    src={itemImg} 
                                    alt={item.name} 
                                    className="w-12 h-12 rounded-xl object-cover border border-gray-100 shrink-0" 
                                  />
                                )}
                                <div className="flex-1">
                                  <h5 className="font-black text-lg">{item.name}</h5>
                                  {item.description && (
                                    <p className="text-xs text-gray-400 line-clamp-1">{item.description}</p>
                                  )}
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
                              );
                            })}
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
      <motion.div 
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-4"
        initial={{ y: 0 }}
        animate={{ y: showNav ? 0 : 100 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <nav className="bg-white/95 backdrop-blur-xl border border-gray-100 px-8 py-4 rounded-full flex justify-around items-center w-full max-w-lg text-logo-text shadow-2xl">
        {profile?.role === 'owner' ? (
          <>
            <button 
              onClick={() => setView('admin')}
              className={`flex flex-col items-center gap-1 transition-all ${view === 'admin' ? 'text-logo-bordeaux' : 'text-gray-400'}`}
            >
              <Bell size={24} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Ventes</span>
            </button>
            <button 
              onClick={() => setView('menu')}
              className={`flex flex-col items-center gap-1 transition-all ${view === 'menu' ? 'text-logo-bordeaux' : 'text-gray-400'}`}
            >
              <MenuIcon size={24} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Cartes</span>
            </button>
            <button 
              onClick={logout}
              className="flex flex-col items-center gap-1 text-gray-400 hover:text-red-500 transition-all"
            >
              <LogOut size={24} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Sortie</span>
            </button>
          </>
        ) : (
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
              <span className="text-[10px] font-bold uppercase tracking-wider">Suivi</span>
            </button>
  
            <button 
              onClick={logout}
              className="flex flex-col items-center gap-1 text-gray-400 hover:text-red-500 transition-all"
            >
              <LogOut size={24} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Sortie</span>
            </button>
          </>
        )}
      </nav>
      </motion.div>

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
              
              <div className="p-8 text-center">
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Votre commande est transmise !<br/>
                  Vous réglerez directement <span className="font-bold text-logo-bordeaux">au comptoir</span> lors du retrait.
                </p>
                <div className="w-48 h-48 bg-gray-50 rounded-3xl mx-auto flex items-center justify-center border border-gray-100 mb-6">
                  <UtensilsCrossed size={64} className="text-gray-300" />
                </div>

                <Button 
                  onClick={() => { setLastPlacedOrder(null); setView('orders'); }}
                  className="w-full py-4 font-black uppercase tracking-widest rounded-2xl shadow-lg"
                >
                  C'est compris !
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Lightbox Modal */}
      <AnimatePresence>
        {selectedImageModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedImageModal(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl relative border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedImageModal(null)}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors shadow-lg"
              >
                <X size={20} />
              </button>
              {(() => {
                const urls = (selectedImageModal.urls && selectedImageModal.urls.length > 0)
                  ? selectedImageModal.urls 
                  : (selectedImageModal.url ? [selectedImageModal.url] : []);
                const currentModalIdx = selectedImageModal.currentIndex || 0;
                const currentModalUrl = urls[currentModalIdx] || selectedImageModal.url || '';
                const hasMultipleModal = urls.length > 1;

                return (
                  <div>
                    <div className="w-full h-72 sm:h-80 bg-gray-900 overflow-hidden relative select-none">
                      <img 
                        src={currentModalUrl} 
                        alt={selectedImageModal.title} 
                        className="w-full h-full object-cover transition-all duration-300"
                      />

                      {hasMultipleModal && (
                        <>
                          <button
                            onClick={() => setSelectedImageModal({
                              ...selectedImageModal,
                              currentIndex: (currentModalIdx - 1 + urls.length) % urls.length
                            })}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-sm z-10 shadow-lg active:scale-90 transition-all"
                            title="Photo précédente"
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <button
                            onClick={() => setSelectedImageModal({
                              ...selectedImageModal,
                              currentIndex: (currentModalIdx + 1) % urls.length
                            })}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-sm z-10 shadow-lg active:scale-90 transition-all"
                            title="Photo suivante"
                          >
                            <ChevronRight size={20} />
                          </button>
                        </>
                      )}

                      {hasMultipleModal && (
                        <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md text-white text-xs font-black px-3 py-1 rounded-full border border-white/10 shadow-md">
                          Photo {currentModalIdx + 1} sur {urls.length}
                        </div>
                      )}
                    </div>

                    {/* Thumbnail Switcher in Modal if multiple photos */}
                    {hasMultipleModal && (
                      <div className="px-6 pt-3 flex gap-2 overflow-x-auto no-scrollbar">
                        {urls.map((u, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedImageModal({ ...selectedImageModal, currentIndex: i })}
                            className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                              i === currentModalIdx ? 'border-logo-bordeaux scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={u} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-logo-bordeaux/10 text-logo-bordeaux text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles size={12} /> Photo GA Döner & Grill
                        </span>
                        {hasMultipleModal && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                            {urls.length} photos disponibles
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-2xl font-black text-logo-text leading-tight">
                          {selectedImageModal.title}
                        </h3>
                        {(() => {
                          const foundItem = menu.find(m => m.name === selectedImageModal.title);
                          return foundItem ? (
                            <span className="text-2xl font-black text-logo-bordeaux tabular-nums shrink-0">
                              {foundItem.price.toFixed(2)}€
                            </span>
                          ) : null;
                        })()}
                      </div>

                      {selectedImageModal.description && (
                        <p className="text-gray-600 text-sm leading-relaxed mb-6 font-medium">
                          {selectedImageModal.description}
                        </p>
                      )}
                      
                      <button 
                        type="button"
                        onClick={() => {
                          const foundItem = menu.find(m => m.name === selectedImageModal.title);
                          if (foundItem) {
                            if (isKebabItem(foundItem)) {
                              setSelectedImageModal(null);
                              setCustomizingKebab(foundItem);
                            } else {
                              addToCart(foundItem);
                              notify(`${foundItem.name} ajouté au panier !`);
                              setSelectedImageModal(null);
                            }
                          } else {
                            setSelectedImageModal(null);
                          }
                        }}
                        className="w-full py-4 px-6 rounded-2xl bg-logo-cream text-logo-text font-black text-sm uppercase tracking-[0.15em] shadow-xl hover:scale-[1.02] hover:brightness-105 active:scale-95 transition-all duration-300 border-2 border-logo-cream flex items-center justify-center gap-2.5 cursor-pointer"
                      >
                        <Plus size={20} strokeWidth={3} className="text-logo-text" />
                        <span>
                          {(() => {
                            const foundItem = menu.find(m => m.name === selectedImageModal.title);
                            return foundItem && isKebabItem(foundItem) ? 'Personnaliser & Ajouter' : 'Ajouter au panier';
                          })()}
                        </span>
                        {(() => {
                          const foundItem = menu.find(m => m.name === selectedImageModal.title);
                          return foundItem ? (
                            <span className="text-xs font-black opacity-80">({foundItem.price.toFixed(2)}€)</span>
                          ) : null;
                        })()}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Kebab Customizer Modal */}
      <AnimatePresence>
        {customizingKebab && (
          <KebabCustomizerModal
            item={customizingKebab}
            onClose={() => setCustomizingKebab(null)}
            onConfirm={({ item, quantity, kebabOptions, totalPrice, comment }) => {
              addToCart(item, { kebabOptions, totalPrice, comment, quantity });
              setCustomizingKebab(null);
            }}
          />
        )}
      </AnimatePresence>



      {/* Order Ready Alert Modal Popup */}
      <AnimatePresence>
        {orderReadyAlertOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl border-4 border-emerald-400 relative overflow-hidden"
            >
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce shadow-md">
                <BellRing size={40} />
              </div>

              <span className="bg-emerald-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest inline-block mb-3">
                Notification Comptoir
              </span>

              <h3 className="text-2xl sm:text-3xl font-black text-logo-text mb-2 uppercase">
                Votre Commande est Prête !
              </h3>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 mb-4">
                <span className="text-xs text-gray-500 font-bold block">Numéro de retrait</span>
                <span className="text-2xl font-black text-logo-bordeaux tracking-wider">
                  #{orderReadyAlertOrder.id.slice(-4).toUpperCase()}
                </span>
              </div>

              <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                Votre festin GA Döner & Grill est tout chaud et vous attend ! Présentez votre numéro au comptoir pour retirer votre commande.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setView('orders');
                    setOrderReadyAlertOrder(null);
                  }}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider shadow-lg transition-all cursor-pointer"
                >
                  Voir ma commande
                </button>
                <button
                  type="button"
                  onClick={() => setOrderReadyAlertOrder(null)}
                  className="py-3.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-all cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {showNotification && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-6 right-6 z-50 pointer-events-none"
          >
            <div className={`p-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-md mx-auto pointer-events-auto ${
              showNotification.type === 'success' ? 'bg-logo-text text-white' : 'bg-red-500 text-white'
            }`}>
              {showNotification.type === 'success' ? <CheckCircle size={20} className="text-logo-cream shrink-0" /> : <X size={20} className="shrink-0" />}
              <p className="font-medium text-sm">{showNotification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppStep, TabView, UserProfile, UserPreferences, Book, Difficulty, LibraryEntity } from './types';
import { generateBookRecommendations, generateBookCover, ensureApiKey, findNearbyLibraries } from './services/geminiService';
import { auth } from './services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import BookCard from './components/BookCard';
import VeoStudio from './components/VeoStudio';
import { Library, User, Sparkles, BookOpen, Heart, Bookmark, List, Film, ArrowRight, Loader2, Zap, MapPin, Navigation, Filter, SortAsc, Crosshair, Lock, LogIn, KeyRound, Users, ShieldCheck, Activity, LogOut } from 'lucide-react';

// Declare google as any to avoid namespace errors
declare var google: any;

// Admin Configuration
const ADMIN_EMAIL = "admin@librariyan.io";

// --- Aesthetic Image Pool for Generated Content ---
const ABSTRACT_COVERS = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop", // Abstract Fluid
  "https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?q=80&w=800&auto=format&fit=crop", // Dark Gradient
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800&auto=format&fit=crop", // Neon
  "https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=800&auto=format&fit=crop", // Neon Particles
  "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?q=80&w=800&auto=format&fit=crop", // Rain
  "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=800&auto=format&fit=crop", // Liquid
];

const getRandomCover = () => ABSTRACT_COVERS[Math.floor(Math.random() * ABSTRACT_COVERS.length)];

// --- Placeholder Data with Images ---
const DUMMY_FAVORITES: Book[] = [
  { 
    title: "The Alchemist", 
    genre: "Adventure",
    summary: "A journey of self-discovery following a shepherd boy in the Egyptian desert.", 
    difficulty: Difficulty.BEGINNER, 
    author: "Paulo Coelho",
    coverUrl: "https://images.unsplash.com/photo-1544377892-db82f4d6d451?q=80&w=800&auto=format&fit=crop" // Desert vibe
  },
  { 
    title: "Sapiens", 
    genre: "History",
    summary: "A brief history of humankind from the Stone Age to the Silicon Age.", 
    difficulty: Difficulty.INTERMEDIATE, 
    author: "Yuval Noah Harari",
    coverUrl: "https://images.unsplash.com/photo-1517411032315-54ef2cb00966?q=80&w=800&auto=format&fit=crop" // History/Museum vibe
  }
];

const DUMMY_READING: Book[] = [
  { 
    title: "Atomic Habits", 
    genre: "Self-Help",
    summary: "An easy and proven way to build good habits and break bad ones.", 
    difficulty: Difficulty.BEGINNER, 
    author: "James Clear",
    coverUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=800&auto=format&fit=crop" // Planning/Structure
  }
];

const DUMMY_READ: Book[] = [
  { 
    title: "1984", 
    genre: "Dystopian",
    summary: "A dystopian social science fiction novel and cautionary tale.", 
    difficulty: Difficulty.INTERMEDIATE, 
    author: "George Orwell",
    coverUrl: "https://images.unsplash.com/photo-1535905557558-afc4877a26fc?q=80&w=800&auto=format&fit=crop" // Eye/Surveillance
  },
  { 
    title: "Meditations", 
    genre: "Philosophy",
    summary: "Personal writings by Marcus Aurelius recording his private notes.", 
    difficulty: Difficulty.ADVANCED, 
    author: "Marcus Aurelius",
    coverUrl: "https://images.unsplash.com/photo-1555677284-6a6f9716399a?q=80&w=800&auto=format&fit=crop" // Statue
  }
];

const DUMMY_ALL: Book[] = [
  { 
    title: "Man's Search for Meaning", 
    genre: "Psychology",
    summary: "Psychologist Viktor Frankl's memoir.", 
    difficulty: Difficulty.INTERMEDIATE,
    coverUrl: "https://images.unsplash.com/photo-1494173853739-c21f58b16055?q=80&w=800&auto=format&fit=crop"
  },
  { 
    title: "Thinking, Fast and Slow", 
    genre: "Psychology",
    summary: "The two systems that drive the way we think.", 
    difficulty: Difficulty.ADVANCED,
    coverUrl: "https://images.unsplash.com/photo-1555449377-51262d05cc5c?q=80&w=800&auto=format&fit=crop"
  },
  { 
    title: "The Prophet", 
    genre: "Poetry",
    summary: "26 prose poetry fables.", 
    difficulty: Difficulty.BEGINNER,
    coverUrl: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=800&auto=format&fit=crop"
  },
  { 
    title: "Tao Te Ching", 
    genre: "Philosophy",
    summary: "Fundamental text for both philosophical and religious Taoism.", 
    difficulty: Difficulty.ADVANCED,
    coverUrl: "https://images.unsplash.com/photo-1518558997970-4ddc236affcd?q=80&w=800&auto=format&fit=crop"
  },
  { 
    title: "Flow", 
    genre: "Psychology",
    summary: "The psychology of optimal experience.", 
    difficulty: Difficulty.INTERMEDIATE,
    coverUrl: "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?q=80&w=800&auto=format&fit=crop"
  },
];

// --- Mock Community Data for Admin ---
const MOCK_USERS = [
  { name: "Alex K.", email: "alex@reader.io", status: "Active", role: "Reader", fav: "Sci-Fi" },
  { name: "Jordan M.", email: "jordan@books.net", status: "Active", role: "Reader", fav: "Philosophy" },
  { name: "Casey R.", email: "casey@library.org", status: "Idle", role: "Reader", fav: "History" },
  { name: "Taylor S.", email: "taylor@write.com", status: "Active", role: "Critic", fav: "Poetry" },
];

// --- Google Maps Styles (Void/Gen Z Aesthetic) ---
const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "poi.park", elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4e4e4e" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] }
];

type SortOption = 'title' | 'difficulty' | 'author';

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.AUTH);
  const [activeTab, setActiveTab] = useState<TabView>(TabView.MATCH);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [showDevBypass, setShowDevBypass] = useState(false);

  // User Data
  const [profile, setProfile] = useState<UserProfile>({ name: '', email: '', age: '', favGenre: '' });
  const [prefs, setPrefs] = useState<UserPreferences>({ personality: '', bookTypes: '', readingTone: '', themes: '' });
  
  // Book Data
  const [recommendations, setRecommendations] = useState<Book[]>([]);

  // Favorites State (initialized with dummy data)
  const [favorites, setFavorites] = useState<Book[]>(DUMMY_FAVORITES);

  // Library Data
  const [libraries, setLibraries] = useState<LibraryEntity[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  
  // Sort & Filter State
  const [sortBy, setSortBy] = useState<SortOption>('title');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('All');
  const [filterGenre, setFilterGenre] = useState<string>('All');

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // Use any to bypass missing google.maps types
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Check Admin
  const isAdmin = profile.email === ADMIN_EMAIL;

  // Persistence & Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setEmail(user.email || '');
        
        // Attempt to restore local data
        const savedProfile = localStorage.getItem('librariyan_profile');
        const savedPrefs = localStorage.getItem('librariyan_prefs');
        const savedRecs = localStorage.getItem('librariyan_recs');
        
        if (savedProfile && savedPrefs && savedRecs) {
          setProfile(JSON.parse(savedProfile));
          setPrefs(JSON.parse(savedPrefs));
          setRecommendations(JSON.parse(savedRecs));
          setStep(AppStep.DASHBOARD);
        } else if (savedProfile) {
           const p = JSON.parse(savedProfile);
           // Ensure email matches auth
           setProfile({ ...p, email: user.email || '' });
           setStep(AppStep.PREFERENCES);
        } else {
           setProfile(prev => ({ ...prev, email: user.email || '' }));
           setStep(AppStep.PROFILE);
        }
      } else {
        setStep(AppStep.AUTH);
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // Load Google Maps Script
  const loadGoogleMaps = () => {
    return new Promise((resolve, reject) => {
      if (!process.env.API_KEY) {
          reject(new Error("API_KEY missing. Cannot load Maps."));
          return;
      }
      // Cast window to any to access google
      if ((window as any).google?.maps) {
        resolve((window as any).google.maps);
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.API_KEY}&libraries=places`;
      script.async = true;
      // Cast window to any to access google
      script.onload = () => resolve((window as any).google.maps);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  // Reset filters when changing tabs
  useEffect(() => {
    setFilterDifficulty('All');
    setFilterGenre('All');
    setSortBy('title');
  }, [activeTab]);

  // Init Google Map when userCoords change and we are in library tab
  useEffect(() => {
    if (activeTab === TabView.LIBRARIES && userCoords && mapContainerRef.current) {
      loadGoogleMaps().then(() => {
        if (!mapInstanceRef.current && mapContainerRef.current) {
          mapInstanceRef.current = new google.maps.Map(mapContainerRef.current, {
            center: userCoords,
            zoom: 14,
            styles: DARK_MAP_STYLES,
            disableDefaultUI: true,
            zoomControl: true,
          });

          // Add User Marker
          new google.maps.Marker({
            position: userCoords,
            map: mapInstanceRef.current,
            title: "You Are Here",
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#ccff00",
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#ffffff",
            }
          });
        } else if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter(userCoords);
        }

        // Clear existing markers
        markersRef.current.forEach(m => m && m.setMap(null));
        markersRef.current = new Array(libraries.length).fill(null);

        // Geocode and add markers for libraries
        const geocoder = new google.maps.Geocoder();
        
        libraries.forEach((lib, idx) => {
           if (lib.address) {
             geocoder.geocode({ address: lib.address }, (results: any, status: any) => {
               if (status === 'OK' && results && results[0] && mapInstanceRef.current) {
                  const marker = new google.maps.Marker({
                    map: mapInstanceRef.current,
                    position: results[0].geometry.location,
                    title: lib.title,
                    icon: {
                      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z", // Pin SVG path approximation or use symbol
                      fillColor: "#d8b4fe", // Lavender
                      fillOpacity: 1,
                      scale: 1.5,
                      strokeWeight: 1,
                      strokeColor: "#000",
                      anchor: new google.maps.Point(12, 22)
                    }
                  });
                  
                  const infoWindow = new google.maps.InfoWindow({
                    content: `<div style="color: black; font-weight: bold;">${lib.title}</div><div style="color: #333; font-size: 10px;">${lib.address}</div>`
                  });
                  
                  marker.addListener('click', () => {
                    infoWindow.open(mapInstanceRef.current, marker);
                  });

                  markersRef.current[idx] = marker;
               }
             });
           }
        });

      }).catch(err => console.error("Failed to load Google Maps", err));
    }
  }, [activeTab, userCoords, libraries]);


  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setShowDevBypass(false);
    setIsLoading(true);

    // Basic Validation
    if (password.length < 6) {
        setAuthError("Password must be at least 6 characters.");
        setIsLoading(false);
        return;
    }

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      // Auth listener will handle redirection
    } catch (err: any) {
      console.error(err);
      setShowDevBypass(true); // Always allow bypass on error to prevent blockers
      
      let msg = "Authentication failed.";
      
      // Error handling
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
           msg = "Invalid email or password.";
           if (!isSignUp) {
               msg += " (Account may not exist)";
           }
      } else if (err.code === 'auth/email-already-in-use') {
           msg = "Email already in use. Try logging in.";
      } else if (err.code === 'auth/weak-password') {
           msg = "Password should be at least 6 characters.";
      } else if (err.code === 'auth/operation-not-allowed') {
          console.warn("Firebase Email/Pass provider not enabled. Falling back to Dev Mode.");
          setProfile(prev => ({ ...prev, email: email || 'dev@librariyan.io' }));
          setStep(AppStep.PROFILE);
          setIsLoading(false);
          return; // Skip setting error
      }

      setAuthError(msg);
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setAuthError("Please enter your email address first.");
      return;
    }
    setAuthError(null);
    setIsLoading(true);
    
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage(`Reset link sent to ${email}. Check your inbox.`);
    } catch (err: any) {
      console.error(err);
      let msg = "Failed to send reset email.";
      if (err.code === 'auth/user-not-found') msg = "No user found with this email.";
      if (err.code === 'auth/invalid-email') msg = "Invalid email format.";
      setAuthError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('librariyan_profile');
    localStorage.removeItem('librariyan_prefs');
    localStorage.removeItem('librariyan_recs');
    setStep(AppStep.AUTH);
    setProfile({ name: '', email: '', age: '', favGenre: '' });
    setPrefs({ personality: '', bookTypes: '', readingTone: '', themes: '' });
    setRecommendations([]);
    setLibraries([]);
    setUserCoords(null);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await ensureApiKey(); 
    localStorage.setItem('librariyan_profile', JSON.stringify(profile));
    setStep(AppStep.PREFERENCES);
  };

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const recs = await generateBookRecommendations(profile, prefs);
      
      // 1. Inject aesthetic covers placeholders first so user gets instant response
      const enrichedRecs = recs.map(book => ({
        ...book,
        coverUrl: getRandomCover()
      }));

      setRecommendations(enrichedRecs);
      
      // Save data for persistence
      localStorage.setItem('librariyan_prefs', JSON.stringify(prefs));
      localStorage.setItem('librariyan_recs', JSON.stringify(enrichedRecs));

      setStep(AppStep.DASHBOARD);
      setIsLoading(false); // Reveal dashboard

      // 2. Trigger Background Generation of AI Covers
      enrichedRecs.forEach(async (book, index) => {
          const cover = await generateBookCover(book.title, book.summary);
          if (cover) {
              setRecommendations(currentRecs => {
                  const newRecs = [...currentRecs];
                  if (newRecs[index] && newRecs[index].title === book.title) {
                      newRecs[index] = { ...newRecs[index], coverUrl: cover };
                      // Update storage so next reload has the AI image
                      localStorage.setItem('librariyan_recs', JSON.stringify(newRecs));
                  }
                  return newRecs;
              });
          }
      });

    } catch (error) {
      console.error("Error generating books:", error);
      alert("System Overload. Try again.");
      setIsLoading(false);
    }
  };

  const toggleFavorite = (book: Book) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.title === book.title);
      if (exists) {
        return prev.filter(f => f.title !== book.title);
      }
      return [...prev, book];
    });
  };

  const handleFindLibraries = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
      });
      try {
        await ensureApiKey();
        const libs = await findNearbyLibraries(position.coords.latitude, position.coords.longitude);
        setLibraries(libs);
        if (libs.length === 0) {
          setLocationError("No libraries found nearby.");
        }
      } catch (err) {
        setLocationError("Failed to fetch library data.");
      } finally {
        setIsLocating(false);
      }
    }, (err) => {
      setLocationError("Location access denied. Please enable permissions.");
      setIsLocating(false);
    });
  };

  const handleLibraryClick = (index: number) => {
    const marker = markersRef.current[index];
    if (marker && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(marker.getPosition());
      mapInstanceRef.current.setZoom(16);
      google.maps.event.trigger(marker, 'click');
      
      // Mobile UX
      if (window.innerWidth < 1024) {
          mapContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // --- Derived State for Filtering & Sorting ---
  const getCurrentBooks = () => {
    switch (activeTab) {
      case TabView.MATCH: return recommendations;
      case TabView.FAVORITES: return favorites;
      case TabView.READING: return DUMMY_READING;
      case TabView.READ: return DUMMY_READ;
      case TabView.ALL: return DUMMY_ALL;
      default: return [];
    }
  };

  const processedBooks = useMemo(() => {
    let books = [...getCurrentBooks()];

    // 1. Filter by Difficulty
    if (filterDifficulty !== 'All') {
      books = books.filter(b => b.difficulty === filterDifficulty);
    }

    // 2. Filter by Genre
    if (filterGenre !== 'All') {
      books = books.filter(b => b.genre === filterGenre);
    }

    // 3. Sort
    books.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'author') return (a.author || '').localeCompare(b.author || '');
      if (sortBy === 'difficulty') {
        const order = { [Difficulty.BEGINNER]: 1, [Difficulty.INTERMEDIATE]: 2, [Difficulty.ADVANCED]: 3 };
        return order[a.difficulty] - order[b.difficulty];
      }
      return 0;
    });

    return books;
  }, [activeTab, recommendations, favorites, filterDifficulty, filterGenre, sortBy]);

  // Extract unique genres from current list for the filter dropdown
  const availableGenres = useMemo(() => {
    const books = getCurrentBooks();
    const genres = new Set(books.map(b => b.genre).filter(Boolean));
    return ['All', ...Array.from(genres)];
  }, [activeTab, recommendations, favorites]);


  // --- UI Components ---

  const renderAuth = () => (
    <div className="min-h-screen flex items-center justify-center bg-void p-4 relative overflow-hidden">
       {/* Background Ambience */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-acid/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-lavender/10 rounded-full blur-[100px]"></div>

      <div className="max-w-md w-full bg-surface p-10 rounded-3xl border border-white/10 relative z-10 backdrop-blur-xl animate-fade-in">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 bg-acid rounded-lg flex items-center justify-center text-black">
                {isResettingPassword ? <KeyRound size={20} /> : <Lock size={20} />}
             </div>
             <h1 className="text-3xl font-display font-bold text-white tracking-tighter">LibrARIYAN</h1>
          </div>
          <p className="text-stone-400 font-mono text-xs uppercase tracking-widest">
            {isResettingPassword 
              ? "Reset Security Protocol" 
              : (isSignUp ? "Initialize Protocol" : "Authenticate Identity")}
          </p>
        </div>

        {isAuthChecking ? (
            <div className="flex flex-col items-center py-10">
               <Loader2 className="animate-spin text-acid mb-4" size={32} />
               <p className="font-mono text-xs text-stone-500 uppercase tracking-widest">Verifying Credentials...</p>
            </div>
        ) : isResettingPassword ? (
          <form onSubmit={handlePasswordReset} className="space-y-5">
             <div>
               <label className="block text-xs font-bold text-acid uppercase tracking-widest mb-2">Recovery Email</label>
               <input required type="email" placeholder="user@system.io" className="w-full p-4 bg-black border border-stone-800 text-white rounded-xl focus:border-acid focus:ring-1 focus:ring-acid outline-none transition-all placeholder-stone-700 font-mono" 
                 value={email} onChange={e => setEmail(e.target.value)} />
             </div>

             {authError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-mono rounded-lg">
                   {authError}
                </div>
             )}
             
             {resetMessage && (
                <div className="p-3 bg-acid/10 border border-acid/20 text-acid text-xs font-mono rounded-lg">
                   {resetMessage}
                </div>
             )}

             <button disabled={isLoading} type="submit" className="w-full bg-white hover:bg-acid text-black py-4 rounded-xl font-bold uppercase tracking-wider transition-colors flex justify-center items-center gap-2 mt-8">
               {isLoading ? <Loader2 className="animate-spin" size={18} /> : "Send Recovery Link"} <ArrowRight size={18} />
             </button>
             
             <div className="mt-6 text-center">
               <button type="button" onClick={() => { setIsResettingPassword(false); setAuthError(null); setResetMessage(null); }} className="text-xs text-stone-500 hover:text-white font-mono uppercase tracking-widest">
                 &lt; Return to Login
               </button>
             </div>
          </form>
        ) : (
          <form onSubmit={handleAuthSubmit} className="space-y-5">
             <div>
              <label className="block text-xs font-bold text-acid uppercase tracking-widest mb-2">User Email</label>
              <input required type="email" placeholder="user@system.io" className="w-full p-4 bg-black border border-stone-800 text-white rounded-xl focus:border-acid focus:ring-1 focus:ring-acid outline-none transition-all placeholder-stone-700 font-mono" 
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
               <div className="flex justify-between mb-2">
                 <label className="block text-xs font-bold text-acid uppercase tracking-widest">Password</label>
                 <button type="button" onClick={() => { setIsResettingPassword(true); setAuthError(null); }} className="text-[10px] text-stone-500 hover:text-white font-mono uppercase tracking-wider">
                   Forgot?
                 </button>
               </div>
              <input required type="password" placeholder="••••••••" className="w-full p-4 bg-black border border-stone-800 text-white rounded-xl focus:border-acid focus:ring-1 focus:ring-acid outline-none transition-all placeholder-stone-700 font-mono" 
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            {authError && (
               <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-mono rounded-lg">
                  {authError}
                  {showDevBypass && (
                      <button 
                        type="button"
                        onClick={() => {
                           setProfile(prev => ({ ...prev, email: email || 'dev_guest@librariyan.io' }));
                           setStep(AppStep.PROFILE);
                        }}
                        className="mt-2 w-full bg-red-500/20 hover:bg-red-500/30 text-white py-2 rounded text-[10px] uppercase font-bold tracking-wider transition-colors flex items-center justify-center gap-2"
                      >
                         <ShieldCheck size={12} /> Bypass Security (Dev Mode)
                      </button>
                  )}
               </div>
            )}

            <button disabled={isLoading} type="submit" className="w-full bg-white hover:bg-acid text-black py-4 rounded-xl font-bold uppercase tracking-wider transition-colors flex justify-center items-center gap-2 mt-8">
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : (isSignUp ? "Create Identity" : "Enter System")} <ArrowRight size={18} />
            </button>
            
            <div className="mt-6 text-center">
               <button type="button" onClick={() => { setIsSignUp(!isSignUp); setAuthError(null); setShowDevBypass(false); }} className="text-xs text-stone-500 hover:text-acid font-mono uppercase tracking-widest">
                 {isSignUp ? "Already have access? Login" : "New user? Create Identity"}
               </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="min-h-screen flex items-center justify-center bg-void p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-acid/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-lavender/10 rounded-full blur-[100px]"></div>

      <div className="max-w-md w-full bg-surface p-10 rounded-3xl border border-white/10 relative z-10 backdrop-blur-xl animate-fade-in">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 bg-acid rounded-lg flex items-center justify-center text-black">
                <Zap size={24} fill="currentColor" />
             </div>
             <h1 className="text-3xl font-display font-bold text-white tracking-tighter">Profile Setup</h1>
          </div>
          <p className="text-stone-400 font-mono text-xs uppercase tracking-widest">Calibrate User Metrics</p>
        </div>
        
        <form onSubmit={handleProfileSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Authenticated ID</label>
            <input disabled type="email" className="w-full p-4 bg-stone-900 border border-stone-800 text-stone-500 rounded-xl outline-none font-mono cursor-not-allowed" 
              value={profile.email} />
          </div>
          <div>
            <label className="block text-xs font-bold text-acid uppercase tracking-widest mb-2">Display Name</label>
            <input required type="text" placeholder="Full Name" className="w-full p-4 bg-black border border-stone-800 text-white rounded-xl focus:border-acid focus:ring-1 focus:ring-acid outline-none transition-all placeholder-stone-700" 
              value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-acid uppercase tracking-widest mb-2">Age</label>
              <input required type="number" placeholder="25" className="w-full p-4 bg-black border border-stone-800 text-white rounded-xl focus:border-acid focus:ring-1 focus:ring-acid outline-none transition-all placeholder-stone-700" 
                value={profile.age} onChange={e => setProfile({...profile, age: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-acid uppercase tracking-widest mb-2">Fav Genre</label>
              <input placeholder="Sci-Fi" className="w-full p-4 bg-black border border-stone-800 text-white rounded-xl focus:border-acid focus:ring-1 focus:ring-acid outline-none transition-all placeholder-stone-700" 
                value={profile.favGenre} onChange={e => setProfile({...profile, favGenre: e.target.value})} />
            </div>
          </div>

          <button type="submit" className="w-full bg-white hover:bg-acid text-black py-4 rounded-xl font-bold uppercase tracking-wider transition-colors flex justify-center items-center gap-2 mt-8">
            Complete Setup <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );

  const renderPreferences = () => (
    <div className="min-h-screen flex items-center justify-center bg-void p-4">
      <div className="max-w-2xl w-full bg-surface p-10 rounded-3xl border border-white/10 animate-fade-in relative">
         {/* Decorative Element */}
         <div className="absolute -top-4 -left-4 w-20 h-20 border-t-4 border-l-4 border-acid rounded-tl-3xl"></div>

        <div className="mb-10">
           <h2 className="text-4xl font-display font-bold text-white mb-2 tracking-tight">Setup Matrix <span className="text-acid">///</span></h2>
           <p className="text-stone-400 font-mono text-sm">Analyzing reading vectors for: <span className="text-white">{profile.name}</span></p>
        </div>

        <form onSubmit={handlePreferencesSubmit} className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-acid uppercase tracking-widest mb-3 flex items-center gap-2">
              <User size={14} /> Personality Matrix
            </label>
            <textarea required className="w-full p-4 bg-black border border-stone-800 text-white rounded-xl focus:border-acid outline-none h-32 placeholder-stone-700 resize-none"
              placeholder="I'm a chaotic good dreamer who loves tech but hates social media..."
              value={prefs.personality} onChange={e => setPrefs({...prefs, personality: e.target.value})} />
          </div>

          <div>
             <label className="block text-xs font-bold text-acid uppercase tracking-widest mb-3 flex items-center gap-2">
              <BookOpen size={14} /> Content Preferences
            </label>
            <input required type="text" className="w-full p-4 bg-black border border-stone-800 text-white rounded-xl focus:border-acid outline-none placeholder-stone-700"
              placeholder="Cyberpunk, Philosophy, Modern History..."
              value={prefs.bookTypes} onChange={e => setPrefs({...prefs, bookTypes: e.target.value})} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-acid uppercase tracking-widest mb-3">Vibe / Tone</label>
              <input required type="text" className="w-full p-4 bg-black border border-stone-800 text-white rounded-xl focus:border-acid outline-none placeholder-stone-700"
                placeholder="Dark, Satirical, Fast-paced..."
                value={prefs.readingTone} onChange={e => setPrefs({...prefs, readingTone: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-acid uppercase tracking-widest mb-3">Core Themes</label>
              <input required type="text" className="w-full p-4 bg-black border border-stone-800 text-white rounded-xl focus:border-acid outline-none placeholder-stone-700"
                placeholder="Existentialism, Innovation..."
                value={prefs.themes} onChange={e => setPrefs({...prefs, themes: e.target.value})} />
            </div>
          </div>

          <button disabled={isLoading} type="submit" className="w-full bg-acid hover:bg-white text-black py-4 rounded-xl font-bold uppercase tracking-widest transition-colors flex justify-center items-center gap-3 shadow-[0_0_20px_rgba(204,255,0,0.3)]">
            {isLoading ? <><Loader2 className="animate-spin" /> Computing Matches...</> : <>Run Algorithm <Sparkles size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="min-h-screen bg-void flex flex-col md:flex-row text-white font-sans animate-fade-in">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-black border-r border-white/10 flex-shrink-0 flex flex-col h-screen sticky top-0 z-50">
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-acid rounded flex items-center justify-center text-black">
              <Zap size={18} fill="currentColor" />
            </div>
            <span className="font-display font-bold text-xl tracking-tighter">LibrARIYAN</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide">
          <p className="px-4 text-[10px] font-bold text-stone-600 uppercase tracking-widest mb-2 mt-4">Main Module</p>
          {[
            { id: TabView.MATCH, icon: Sparkles, label: "The Vibe" },
            { id: TabView.FAVORITES, icon: Heart, label: "Stashed" },
            { id: TabView.READING, icon: Bookmark, label: "Current" },
            { id: TabView.READ, icon: BookOpen, label: "Archive" },
            { id: TabView.ALL, icon: List, label: "Discover" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-4 transition-all group ${
                activeTab === item.id 
                  ? 'bg-surface text-white shadow-lg border border-white/5' 
                  : 'text-stone-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={20} className={`transition-colors ${activeTab === item.id ? 'text-acid' : 'group-hover:text-acid'}`} />
              <span className="font-medium tracking-wide">{item.label}</span>
            </button>
          ))}
          
          <p className="px-4 text-[10px] font-bold text-stone-600 uppercase tracking-widest mb-2 mt-8">Explore</p>
           <button
              onClick={() => setActiveTab(TabView.LIBRARIES)}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-4 transition-all group ${
                activeTab === TabView.LIBRARIES 
                  ? 'bg-surface text-white shadow-lg border border-white/5' 
                  : 'text-stone-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <MapPin size={20} className={`transition-colors ${activeTab === TabView.LIBRARIES ? 'text-acid' : 'group-hover:text-acid'}`} />
              <span className="font-medium tracking-wide">Local Spots</span>
            </button>
          
           <button
              onClick={() => setActiveTab(TabView.COMMUNITY)}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-4 transition-all group ${
                activeTab === TabView.COMMUNITY
                  ? 'bg-surface text-white shadow-lg border border-white/5' 
                  : 'text-stone-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users size={20} className={`transition-colors ${activeTab === TabView.COMMUNITY ? 'text-acid' : 'group-hover:text-acid'}`} />
              <span className="font-medium tracking-wide">Community</span>
            </button>

          <p className="px-4 text-[10px] font-bold text-stone-600 uppercase tracking-widest mb-2 mt-8">Creative Lab</p>
           <button
              onClick={() => setActiveTab(TabView.TRAILER)}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-4 transition-all group ${
                activeTab === TabView.TRAILER 
                  ? 'bg-acid text-black shadow-[0_0_15px_rgba(204,255,0,0.4)]' 
                  : 'text-stone-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <Film size={20} className={activeTab === TabView.TRAILER ? 'text-black' : 'group-hover:text-acid'} />
              <span className="font-bold tracking-wide">Veo Studio</span>
            </button>
        </nav>

        <div className="p-8 border-t border-white/5">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-acid to-blue-500"></div>
             <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">{profile.name || "User"}</p>
                <p className="text-[10px] text-stone-500 uppercase tracking-wider">{isAdmin ? 'System Admin' : 'Online'}</p>
             </div>
          </div>
          <button 
             onClick={handleLogout}
             className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 text-stone-500 hover:text-white hover:bg-white/10 text-xs font-bold uppercase tracking-wider transition-colors"
          >
             <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto h-screen relative">
        {/* Background Grid */}
        <div className="fixed inset-0 pointer-events-none z-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <header className="mb-8 relative z-10">
           <div className="inline-block px-3 py-1 bg-white/5 rounded-full border border-white/10 mb-4">
             <span className="text-[10px] font-mono uppercase text-acid tracking-widest">Dashboard // {activeTab}</span>
           </div>
           <h1 className="text-5xl md:text-7xl font-display font-bold text-white tracking-tighter mb-4">
             {activeTab === TabView.MATCH && "Your Rotation"}
             {activeTab === TabView.FAVORITES && "The Stash"}
             {activeTab === TabView.TRAILER && "Visual Lab"}
             {activeTab === TabView.ALL && "Infinite Scroll"}
             {activeTab === TabView.READING && "In Progress"}
             {activeTab === TabView.READ && "Completed"}
             {activeTab === TabView.LIBRARIES && "Local Grid"}
             {activeTab === TabView.COMMUNITY && "The Network"}
           </h1>
           <p className="text-xl text-stone-400 font-light max-w-2xl">
             {activeTab === TabView.MATCH && "Algorithmically curated based on your vibe check."}
             {activeTab === TabView.FAVORITES && "The books that actually mattered."}
             {activeTab === TabView.TRAILER && "Turn your imagination into 1080p reality with Veo."}
             {activeTab === TabView.ALL && "Everything we have in the database."}
             {activeTab === TabView.READING && "Currently processing."}
             {activeTab === TabView.READ && "Successfully archived."}
             {activeTab === TabView.LIBRARIES && "Find where the knowledge lives in your physical sector."}
             {activeTab === TabView.COMMUNITY && (isAdmin ? "Admin Access: User Database Overview." : "Manage your reader identity.")}
           </p>
        </header>

        <div className="relative z-10">
          
          {/* Filtering & Sorting Toolbar */}
          {(activeTab === TabView.MATCH || activeTab === TabView.FAVORITES || activeTab === TabView.ALL) && (
             <div className="mb-8 p-4 bg-surface/50 border border-white/10 rounded-2xl backdrop-blur-md flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                  {/* Genre Filter */}
                  <div className="relative group">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 group-hover:text-acid" />
                    <select 
                      value={filterGenre}
                      onChange={(e) => setFilterGenre(e.target.value)}
                      className="pl-10 pr-8 py-2 bg-black border border-stone-800 text-white text-sm rounded-xl focus:border-acid outline-none appearance-none cursor-pointer hover:border-stone-600 min-w-[140px]"
                    >
                      {availableGenres.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  {/* Difficulty Filter */}
                  <div className="relative group">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 group-hover:text-acid" />
                    <select 
                      value={filterDifficulty}
                      onChange={(e) => setFilterDifficulty(e.target.value)}
                      className="pl-10 pr-8 py-2 bg-black border border-stone-800 text-white text-sm rounded-xl focus:border-acid outline-none appearance-none cursor-pointer hover:border-stone-600 min-w-[140px]"
                    >
                      <option value="All">All Levels</option>
                      <option value={Difficulty.BEGINNER}>{Difficulty.BEGINNER}</option>
                      <option value={Difficulty.INTERMEDIATE}>{Difficulty.INTERMEDIATE}</option>
                      <option value={Difficulty.ADVANCED}>{Difficulty.ADVANCED}</option>
                    </select>
                  </div>
                </div>

                {/* Sort By */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                   <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest whitespace-nowrap">Sort By</span>
                   <div className="relative group flex-grow md:flex-grow-0">
                      <SortAsc size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 group-hover:text-acid" />
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="w-full md:w-auto pl-10 pr-8 py-2 bg-black border border-stone-800 text-white text-sm rounded-xl focus:border-acid outline-none appearance-none cursor-pointer hover:border-stone-600"
                      >
                        <option value="title">Title (A-Z)</option>
                        <option value="difficulty">Difficulty</option>
                        <option value="author">Author (A-Z)</option>
                      </select>
                   </div>
                </div>
             </div>
          )}


          {/* Book Grids */}
          {(activeTab === TabView.MATCH || activeTab === TabView.FAVORITES || activeTab === TabView.ALL || activeTab === TabView.READING || activeTab === TabView.READ) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in pb-20">
              {processedBooks.length > 0 ? (
                processedBooks.map((book, idx) => (
                  <BookCard 
                    key={`${book.title}-${idx}`} 
                    book={book} 
                    isRecommendation={activeTab === TabView.MATCH} 
                    isFavorite={favorites.some(f => f.title === book.title)}
                    onToggleFavorite={() => toggleFavorite(book)}
                  />
                ))
              ) : (
                <div className="col-span-full border border-dashed border-stone-800 rounded-2xl p-20 text-center">
                  <p className="text-stone-500 font-mono uppercase">
                    {activeTab === TabView.FAVORITES && favorites.length === 0 ? "YOUR STASH IS EMPTY." : "NO RESULTS MATCH YOUR FILTERS."}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === TabView.LIBRARIES && (
             <div className="animate-fade-in max-w-7xl mx-auto h-[70vh] flex flex-col lg:flex-row gap-6">
                
                {/* Side Panel: Controls & List */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6 h-full">
                  {!isLocating && libraries.length === 0 && (
                     <div className="bg-surface rounded-3xl p-8 border border-stone-800 text-center flex-grow flex flex-col justify-center items-center">
                        <div className="w-16 h-16 bg-stone-900 rounded-full flex items-center justify-center mb-6">
                          <MapPin className="text-acid" size={28} />
                        </div>
                        <h3 className="text-xl font-display font-bold mb-4">Initialize Location Scan</h3>
                        <p className="text-stone-400 mb-8 max-w-xs mx-auto text-sm">Access your coordinates to visualize the nearest book repositories.</p>
                        
                        <button 
                          onClick={handleFindLibraries}
                          className="bg-acid text-black hover:bg-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(204,255,0,0.2)] flex items-center gap-3"
                        >
                           <Navigation size={18} /> Grant Access
                        </button>
                        
                        {locationError && (
                          <p className="mt-6 text-red-500 font-mono text-xs border border-red-500/20 bg-red-500/10 p-3 rounded-lg inline-block">{locationError}</p>
                        )}
                     </div>
                  )}
                  
                  {isLocating && (
                     <div className="bg-surface rounded-3xl p-8 border border-stone-800 text-center flex-grow flex flex-col items-center justify-center">
                        <Loader2 className="animate-spin text-acid mb-6" size={48} />
                        <p className="font-mono text-acid text-sm uppercase tracking-widest animate-pulse">Scanning Sector...</p>
                     </div>
                  )}

                  {!isLocating && libraries.length > 0 && (
                     <div className="flex flex-col h-full bg-surface border border-stone-800 rounded-3xl overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/50 backdrop-blur-sm">
                           <h3 className="font-mono text-stone-500 text-xs uppercase tracking-widest flex items-center gap-2">
                             <Crosshair size={14} className="text-acid" /> Entities Detected: {libraries.length}
                           </h3>
                           <button onClick={handleFindLibraries} className="text-[10px] text-acid hover:text-white uppercase tracking-wider font-bold">Re-scan</button>
                        </div>
                        
                        <div className="overflow-y-auto flex-grow p-4 space-y-4 custom-scrollbar">
                            {libraries.map((lib, idx) => (
                              <div key={idx} className="group bg-black/40 hover:bg-stone-900 border border-white/5 hover:border-acid transition-all p-4 rounded-xl flex gap-4 relative">
                                 <div className="w-12 h-12 bg-stone-950 rounded-lg flex items-center justify-center shrink-0 border border-stone-800 group-hover:border-acid/30 transition-colors">
                                    <Library className="text-stone-400 group-hover:text-acid" size={20} />
                                 </div>
                                 <div className="flex-grow min-w-0">
                                    <h4 className="font-bold text-white text-sm truncate mb-1 group-hover:text-acid transition-colors">{lib.title}</h4>
                                    {lib.address && <p className="text-stone-500 font-mono text-[10px] line-clamp-2 leading-tight">{lib.address}</p>}
                                    <button 
                                      onClick={() => handleLibraryClick(idx)}
                                      className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-acid mt-3 hover:text-white hover:underline decoration-acid decoration-2 underline-offset-4"
                                    >
                                      Locate on Grid <Crosshair size={10} />
                                    </button>
                                 </div>
                              </div>
                            ))}
                        </div>
                     </div>
                  )}
                </div>

                {/* Map Panel */}
                <div className="w-full lg:w-2/3 h-[50vh] lg:h-full bg-surface rounded-3xl border border-stone-800 overflow-hidden relative">
                   {userCoords ? (
                     <div ref={mapContainerRef} className="w-full h-full z-0"></div>
                   ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center opacity-20">
                        <MapPin size={80} className="mb-4" />
                        <p className="font-display font-bold text-2xl tracking-tighter">WAITING FOR COORDINATES</p>
                     </div>
                   )}
                   
                   {/* Map Overlay Decor */}
                   <div className="absolute top-4 right-4 z-[400] bg-black/80 backdrop-blur px-3 py-1 rounded border border-white/10">
                      <span className="text-[10px] font-mono text-acid uppercase tracking-widest">Live Sat Feed</span>
                   </div>
                </div>

             </div>
          )}

          {activeTab === TabView.TRAILER && <VeoStudio />}

          {activeTab === TabView.COMMUNITY && (
            <div className="animate-fade-in max-w-6xl mx-auto">
              {isAdmin ? (
                // ADMIN VIEW
                <div className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-surface p-6 rounded-2xl border border-stone-800">
                         <p className="text-stone-500 text-xs font-mono uppercase mb-2">Total Users</p>
                         <p className="text-3xl font-bold font-display text-white">{MOCK_USERS.length + 1}</p>
                      </div>
                      <div className="bg-surface p-6 rounded-2xl border border-stone-800">
                         <p className="text-stone-500 text-xs font-mono uppercase mb-2">Active Sessions</p>
                         <p className="text-3xl font-bold font-display text-acid">3</p>
                      </div>
                      <div className="bg-surface p-6 rounded-2xl border border-stone-800">
                         <p className="text-stone-500 text-xs font-mono uppercase mb-2">System Status</p>
                         <p className="text-3xl font-bold font-display text-lavender flex items-center gap-2">
                           <Activity size={24} /> Online
                         </p>
                      </div>
                      <div className="bg-surface p-6 rounded-2xl border border-stone-800 relative overflow-hidden">
                         <p className="text-stone-500 text-xs font-mono uppercase mb-2">Admin Mode</p>
                         <p className="text-3xl font-bold font-display text-white">Active</p>
                         <ShieldCheck className="absolute -bottom-4 -right-4 text-white/5 w-24 h-24" />
                      </div>
                   </div>

                   <div className="bg-surface rounded-3xl border border-stone-800 overflow-hidden">
                      <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <h3 className="font-bold text-lg">User Database</h3>
                        <div className="flex gap-2">
                           <button className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1 rounded-lg text-stone-400">Export CSV</button>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead>
                             <tr className="border-b border-white/5 bg-black/20">
                               <th className="p-4 text-xs font-mono text-stone-500 uppercase">User Identity</th>
                               <th className="p-4 text-xs font-mono text-stone-500 uppercase">Status</th>
                               <th className="p-4 text-xs font-mono text-stone-500 uppercase">Role</th>
                               <th className="p-4 text-xs font-mono text-stone-500 uppercase">Genre Interest</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-white/5">
                             {/* Current User Row */}
                             <tr className="hover:bg-white/5 transition-colors">
                               <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-acid flex items-center justify-center text-black font-bold text-xs">YOU</div>
                                    <div>
                                      <p className="font-bold text-white text-sm">{profile.name}</p>
                                      <p className="text-stone-500 text-xs">{profile.email}</p>
                                    </div>
                                  </div>
                               </td>
                               <td className="p-4">
                                 <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-acid/20 text-acid text-[10px] uppercase font-bold border border-acid/20">
                                   <div className="w-1.5 h-1.5 rounded-full bg-acid animate-pulse"></div> Online
                                 </span>
                               </td>
                               <td className="p-4"><span className="text-stone-300 text-sm">Admin</span></td>
                               <td className="p-4"><span className="text-stone-400 text-sm">{profile.favGenre}</span></td>
                             </tr>
                             {/* Mock Users */}
                             {MOCK_USERS.map((u, i) => (
                               <tr key={i} className="hover:bg-white/5 transition-colors">
                                 <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-stone-400 font-bold text-xs">{u.name[0]}</div>
                                      <div>
                                        <p className="font-bold text-white text-sm">{u.name}</p>
                                        <p className="text-stone-500 text-xs">{u.email}</p>
                                      </div>
                                    </div>
                                 </td>
                                 <td className="p-4">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] uppercase font-bold border ${u.status === 'Active' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-stone-500/10 text-stone-500 border-stone-500/20'}`}>
                                     {u.status}
                                   </span>
                                 </td>
                                 <td className="p-4"><span className="text-stone-300 text-sm">{u.role}</span></td>
                                 <td className="p-4"><span className="text-stone-400 text-sm">{u.fav}</span></td>
                               </tr>
                             ))}
                           </tbody>
                        </table>
                      </div>
                   </div>
                </div>
              ) : (
                // REGULAR USER VIEW (Profile Only)
                <div className="flex justify-center items-center min-h-[50vh]">
                   <div className="bg-surface border border-stone-800 rounded-3xl p-8 max-w-lg w-full relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-acid via-white to-lavender"></div>
                      
                      <div className="flex flex-col items-center text-center mb-8 relative z-10">
                         <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-stone-800 to-black p-1 border border-stone-700 mb-4">
                            <div className="w-full h-full rounded-full bg-stone-900 flex items-center justify-center">
                              <span className="text-3xl font-display font-bold text-white">{profile.name.charAt(0)}</span>
                            </div>
                         </div>
                         <h2 className="text-2xl font-bold text-white mb-1">{profile.name}</h2>
                         <p className="text-stone-500 font-mono text-xs">{profile.email}</p>
                         
                         <div className="mt-4 flex gap-2">
                            <span className="px-3 py-1 rounded-full bg-white/5 text-stone-300 text-xs border border-white/10">{profile.age} Years Old</span>
                            <span className="px-3 py-1 rounded-full bg-acid/10 text-acid text-xs border border-acid/20">{profile.favGenre} Fan</span>
                         </div>
                      </div>

                      <div className="space-y-4 relative z-10">
                         <div className="bg-black/50 p-4 rounded-xl border border-white/5">
                            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Personality Matrix</p>
                            <p className="text-sm text-stone-300 italic">"{prefs.personality || 'Not calibrated'}"</p>
                         </div>
                         <div className="bg-black/50 p-4 rounded-xl border border-white/5">
                            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Vibe Setting</p>
                            <p className="text-sm text-stone-300">{prefs.readingTone || 'Standard'}</p>
                         </div>
                      </div>
                      
                      {/* Decorative Background */}
                      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-acid/5 rounded-full blur-2xl group-hover:bg-acid/10 transition-colors"></div>
                   </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );

  // Return the correct view based on step
  switch (step) {
    case AppStep.AUTH:
      return renderAuth();
    case AppStep.PROFILE:
      return renderProfile();
    case AppStep.PREFERENCES:
      return renderPreferences();
    case AppStep.DASHBOARD:
      return renderDashboard();
    default:
      return renderAuth();
  }
}
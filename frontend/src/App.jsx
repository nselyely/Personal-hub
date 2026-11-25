import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  Routes, Route, Navigate, Link, NavLink, useLocation, useNavigate, useParams
} from 'react-router-dom'
import {
  checkHealth, createFamilyComment, createFamilyPost, createInvitation,
  getSession, loadFamilyFeed, loadFamilyMembers, loadInvitations, loadPendingPublicationComments,
  loadProfile, loadPublication, loadPublicationComments, moderatePublicationComment,
  register, saveProfile as updateProfile, signIn, signOut, submitPublicationComment
} from './api'
import { loadPhotos, loadPublications, savePhoto, savePublication } from './contentStore'
import {
  Menu, X, Search, Bell, ChevronDown, ChevronRight, Home, UserRound,
  UsersRound, GitBranch, Images, Newspaper, Mail, LayoutDashboard,
  ShieldCheck, Settings, FileText, FolderOpen, UserCog, ChartNoAxesColumn,
  History, LockKeyhole, Plus, ArrowRight, ArrowUpRight, Eye, Pencil,
  Trash2, MoreHorizontal, CalendarDays, CheckCircle2, Clock3, ImagePlus,
  Heart, Globe2, LogIn, UserPlus, KeyRound, Camera, BookOpen, Upload,
  Filter, Download, Sparkles, CircleHelp, PanelLeftClose, PanelLeftOpen, LogOut
} from 'lucide-react'

const publicPages = [
  { path: '/', title: 'Home', icon: Home, kind: 'home' },
  { path: '/about', title: 'About Me', icon: UserRound, kind: 'about' },
  { path: '/family', title: 'My Family', icon: UsersRound, kind: 'family' },
  { path: '/family-tree', title: 'Family Tree', icon: GitBranch, kind: 'tree' },
  { path: '/gallery', title: 'Photo Gallery', icon: Images, kind: 'gallery' },
  { path: '/publications', title: 'Publications', icon: Newspaper, kind: 'posts' },
  { path: '/contact', title: 'Contact', icon: Mail, kind: 'contact' }
]

const authPages = [
  { path: '/login', title: 'Login', icon: LogIn, kind: 'login' },
  { path: '/register', title: 'Register', icon: UserPlus, kind: 'register' },
  { path: '/forgot-password', title: 'Forgot Password', icon: KeyRound, kind: 'forgot' },
  { path: '/my-account', title: 'My Account', icon: UserRound, kind: 'account', area: 'family' }
]

const familyPages = [
  { path: '/family-portal', title: 'Dashboard', icon: LayoutDashboard, area: 'family', kind: 'dashboard' },
  { path: '/family-portal/profile', title: 'My Profile', icon: UserRound, area: 'family', kind: 'profile' },
  { path: '/family-portal/members', title: 'Family Members', icon: UsersRound, area: 'family', kind: 'members' },
  { path: '/family-portal/tree', title: 'Family Tree', icon: GitBranch, area: 'family', kind: 'tree' },
  { path: '/family-portal/gallery', title: 'Family Gallery', icon: Images, area: 'family', kind: 'gallery' },
  { path: '/family-portal/news', title: 'Family Feed', icon: Newspaper, area: 'family', kind: 'family-feed' },
  { path: '/family-portal/settings', title: 'My Settings', icon: Settings, area: 'family', kind: 'settings' }
]

const adminPages = [
  { path: '/admin', title: 'Dashboard', icon: LayoutDashboard, area: 'admin', kind: 'dashboard' },
  { path: '/admin/users', title: 'Manage Users', icon: UserCog, area: 'admin', kind: 'users' },
  { path: '/admin/family', title: 'Manage Family', icon: UsersRound, area: 'admin', kind: 'members' },
  { path: '/admin/family-tree', title: 'Family Tree Management', icon: GitBranch, area: 'admin', kind: 'tree' },
  { path: '/admin/personal-profile', title: 'Personal Profile', icon: UserRound, area: 'admin', kind: 'profile' },
  { path: '/admin/publications', title: 'Manage Publications', icon: FileText, area: 'admin', kind: 'posts' },
  { path: '/admin/gallery', title: 'Manage Gallery', icon: Images, area: 'admin', kind: 'gallery' },
  { path: '/admin/albums', title: 'Manage Albums', icon: FolderOpen, area: 'admin', kind: 'albums' },
  { path: '/admin/invitations', title: 'Family Invitations', icon: Mail, area: 'admin', kind: 'invitations' },
  { path: '/admin/approvals', title: 'Approvals & Moderation', icon: ShieldCheck, area: 'admin', kind: 'approvals' },
  { path: '/admin/reports', title: 'Reports & Analytics', icon: ChartNoAxesColumn, area: 'admin', kind: 'reports' },
  { path: '/admin/activity', title: 'Activity Logs', icon: History, area: 'admin', kind: 'activity' },
  { path: '/admin/website-settings', title: 'Website Settings', icon: Settings, area: 'admin', kind: 'website-settings' },
  { path: '/admin/privacy', title: 'Privacy & Security', icon: LockKeyhole, area: 'admin', kind: 'privacy' }
]

const editorPages = [
  { path: '/editor', title: 'Dashboard', icon: LayoutDashboard, area: 'editor', kind: 'dashboard' },
  { path: '/editor/create-publication', title: 'Create Publication', icon: Plus, area: 'editor', kind: 'create-post' },
  { path: '/editor/my-publications', title: 'My Publications', icon: FileText, area: 'editor', kind: 'posts' },
  { path: '/editor/family-profiles', title: 'Family Profiles', icon: UsersRound, area: 'editor', kind: 'members' },
  { path: '/editor/upload-photos', title: 'Upload Photographs', icon: Upload, area: 'editor', kind: 'upload' },
  { path: '/editor/albums', title: 'Manage Albums', icon: FolderOpen, area: 'editor', kind: 'albums' },
  { path: '/editor/publication-status', title: 'Publication Status', icon: Clock3, area: 'editor', kind: 'status' },
  { path: '/editor/profile', title: 'My Profile', icon: UserRound, area: 'editor', kind: 'profile' }
]

const allPages = [...publicPages, ...authPages, ...familyPages, ...adminPages, ...editorPages]
const AppContext = createContext(null)
const useApp = () => useContext(AppContext)

function App() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [backendStatus, setBackendStatus] = useState('checking')
  const [toast, setToast] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [savedItems, setSavedItems] = useState([])
  const [publications, setPublications] = useState([])
  const [photos, setPhotos] = useState([])
  const notify = (message) => {
    setToast(message)
    window.clearTimeout(window.__phToast)
    window.__phToast = window.setTimeout(() => setToast(''), 2800)
  }
  useEffect(() => {
    let active = true
    const refreshHealth = () => checkHealth()
      .then(() => { if (active) setBackendStatus('connected') })
      .catch(error => {
        console.error('Could not reach the PersonalHub API:', error)
        if (active) setBackendStatus('offline')
      })
    refreshHealth()
    const healthInterval = window.setInterval(refreshHealth, 30000)
    getSession()
      .then(sessionUser => { if (active) setUser(sessionUser) })
      .catch(error => {
        console.error('Could not restore the PersonalHub session:', error)
        if (active) notify('Could not verify your account session.')
      })
      .finally(() => { if (active) setAuthReady(true) })
    return () => {
      active = false
      window.clearInterval(healthInterval)
    }
  }, [])
  useEffect(() => {
    let active = true
    Promise.all([loadPublications(), loadPhotos()])
      .then(([savedPublications, savedPhotos]) => {
        if (active) {
          setPublications(savedPublications)
          setPhotos(savedPhotos)
        }
      })
      .catch(error => {
        console.error('Could not load PersonalHub content from the backend:', error)
        if (active) notify('Could not load posts and photos from the backend.')
      })
    return () => { active = false }
  }, [user?.id])
  const addPublication = async publication => {
    const savedPublication = await savePublication(publication)
    setPublications(current => [savedPublication, ...current])
    return savedPublication
  }
  const addPhoto = async photo => {
    const savedPhoto = await savePhoto(photo)
    setPhotos(current => [savedPhoto, ...current])
    return savedPhoto
  }
  const login = async credentials => {
    const signedInUser = await signIn(credentials)
    setUser(signedInUser)
    return signedInUser
  }
  const createAccount = async details => {
    const createdUser = await register(details)
    setUser(createdUser)
    return createdUser
  }
  const logout = async () => {
    await signOut()
    setUser(null)
  }
  const value = useMemo(() => ({
    user, setCurrentUser: setUser, login, createAccount, logout, authReady, backendStatus, notify,
    mobileOpen, setMobileOpen, savedItems, setSavedItems, publications, photos,
    addPublication, addPhoto
  }), [user, authReady, backendStatus, mobileOpen, savedItems, publications, photos])
  return (
    <AppContext.Provider value={value}>
      <Routes>
        {allPages.map(page => (
          <Route key={page.path} path={page.path} element={<PageRouter page={page} />} />
        ))}
        <Route path="/publications/:publicationId" element={<PublicLayout page={publicPages.find(item => item.path === '/publications')}><PublicationDetailPage /></PublicLayout>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    </AppContext.Provider>
  )
}

export default App

function roleLabel(role) {
  return ({ family_member: 'Family Member', super_admin: 'Super Admin', editor: 'Editor' })[role] || 'Visitor'
}

function PageRouter({ page }) {
  const { user, authReady } = useApp()
  const location = useLocation()
  if ((page.area || page.kind === 'account') && !authReady) return <div className="not-found">Checking your account…</div>
  if (page.area || page.kind === 'account') {
    if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
    if (page.area === 'admin' && user.role !== 'super_admin') return <Navigate to="/family-portal" replace />
    if (page.area === 'editor' && !['editor', 'super_admin'].includes(user.role)) return <Navigate to="/family-portal" replace />
    if ((page.area === 'family' || page.kind === 'account') && !['family_member', 'editor', 'super_admin'].includes(user.role)) return <Navigate to="/login" replace />
    return <DashboardLayout page={page} />
  }
  if (page.kind === 'login' || page.kind === 'register' || page.kind === 'forgot') return <AuthLayout page={page} />
  return <PublicLayout page={page} />
}

function PublicLayout({ page, children }) {
  const { user, logout, notify } = useApp()
  const navigate = useNavigate()
  const handleLogout = async () => {
    try {
      await logout()
      notify('You have signed out.')
      navigate('/')
    } catch (error) {
      console.error('Could not sign out:', error)
      notify('Could not sign out. Please try again.')
    }
  }
  return (
    <div className="public-shell">
      <header className="public-header">
        <Link to="/" className="brand"><span className="brand-mark"><Heart size={19} fill="currentColor" /></span><span>Personal<span className="brand-gold">Hub</span><small>OUR STORY • OUR FAMILY • OUR MEMORIES</small></span></Link>
        <nav className="public-nav">
          {publicPages.map(item => <NavLink key={item.path} to={item.path} end={item.path === '/'}>{item.title}</NavLink>)}
        </nav>
        <div className="header-actions">
          <ConnectionIndicator />
          {user ? <><Link to={user.role === 'super_admin' ? '/admin' : user.role === 'editor' ? '/editor' : '/family-portal'} className="btn btn-outline btn-small">My workspace</Link><button className="btn btn-primary btn-small" onClick={handleLogout}>Sign out</button></> : <><Link to="/login" className="btn btn-outline btn-small">Family Login</Link><Link to="/register" className="btn btn-primary btn-small">Join Family</Link></>}
        </div>
        <MobileMenuButton />
      </header>
      <main>{children || <PageContent page={page} />}</main>
      <PublicFooter />
    </div>
  )
}

function ConnectionIndicator() {
  const { backendStatus } = useApp()
  const label = backendStatus === 'connected' ? 'API connected' : backendStatus === 'offline' ? 'API offline' : 'Checking API'
  return <span className={`connection-indicator connection-${backendStatus}`} title="API and database status"><i />{label}</span>
}

function MobileMenuButton() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mobile-menu-wrap">
      <button className="icon-btn mobile-menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X /> : <Menu />}</button>
      {open && <div className="mobile-nav">{publicPages.map(item => <Link key={item.path} to={item.path} onClick={() => setOpen(false)}>{item.title}</Link>)}<Link to="/login">Family Login</Link></div>}
    </div>
  )
}

function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="footer-main">
        <div><Link to="/" className="brand footer-brand"><span className="brand-mark"><Heart size={18} fill="currentColor" /></span><span>Personal<span className="brand-gold">Hub</span></span></Link><p>A private space for our stories, connections and treasured memories.</p></div>
        <div><strong>Explore</strong><Link to="/about">About Me</Link><Link to="/family">Our Family</Link><Link to="/gallery">Gallery</Link></div>
        <div><strong>Community</strong><Link to="/publications">Stories & News</Link><Link to="/family-tree">Family Tree</Link><Link to="/contact">Contact</Link></div>
        <div><strong>Family Access</strong><Link to="/login">Member Login</Link><Link to="/register">Invitation Registration</Link></div>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} PersonalHub. All rights reserved.</span><span>Share with care • Respect every member's privacy</span></div>
    </footer>
  )
}

function DashboardLayout({ page }) {
  const { mobileOpen, setMobileOpen, user, logout, notify } = useApp()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const area = page.area || 'family'
  const pages = area === 'admin' ? adminPages : area === 'editor' ? editorPages : familyPages
  const areaTitle = area === 'admin' ? 'Administration' : area === 'editor' ? 'Content Studio' : 'Family Portal'
  const handleLogout = async () => {
    try {
      await logout()
      notify('You have signed out.')
      navigate('/')
    } catch (error) {
      console.error('Could not sign out:', error)
      notify('Could not sign out. Please try again.')
    }
  }
  return (
    <div className={`dashboard-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <Link to="/" className="brand sidebar-brand"><span className="brand-mark"><Heart size={18} fill="currentColor" /></span><span>Personal<span className="brand-gold">Hub</span><small>{areaTitle.toUpperCase()}</small></span></Link>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav">
          {pages.map(item => {
            const Icon = item.icon
            return <NavLink key={item.path} to={item.path} end className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`} onClick={() => setMobileOpen(false)} title={item.title}><Icon size={18} /><span>{item.title}</span></NavLink>
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note"><ShieldCheck size={18}/><span><strong>Privacy first</strong><small>Only share what you choose.</small></span></div>
          <Link to="/" className="side-link"><Globe2 size={18}/><span>View public website</span></Link>
          <Link to="/my-account" className="side-link"><Settings size={18}/><span>Account settings</span></Link>
        </div>
      </aside>
      {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button className="icon-btn sidebar-toggle" onClick={() => setCollapsed(!collapsed)} aria-label="Collapse sidebar">{collapsed ? <PanelLeftOpen size={19}/> : <PanelLeftClose size={19}/>}</button>
            <button className="icon-btn mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu /></button>
            <div className="breadcrumb"><span>{areaTitle}</span><ChevronRight size={14}/><strong>{page.title}</strong></div>
          </div>
          <div className="topbar-right">
            <ConnectionIndicator />
            <button className="icon-btn notification-btn" title="Notifications"><Bell size={19}/><i/></button>
            <div className="top-user"><div className="avatar avatar-small"><ProfileAvatar image={user?.image} name={user?.fullName}/></div><div><strong>{user?.fullName}</strong><small>{roleLabel(user?.role)}</small></div></div>
            <button className="icon-btn" title="Sign out" aria-label="Sign out" onClick={handleLogout}><LogOut size={17}/></button>
          </div>
        </header>
        <div className="dashboard-content"><PageContent page={page} /></div>
      </section>
    </div>
  )
}

function AuthLayout({ page }) {
  return (
    <div className="auth-shell">
      <div className="auth-brand-panel">
        <Link to="/" className="brand auth-brand"><span className="brand-mark"><Heart size={20} fill="currentColor"/></span><span>Personal<span className="brand-gold">Hub</span></span></Link>
        <div className="auth-message"><span className="eyebrow light-eyebrow">OUR FAMILY. OUR STORY.</span><h1>Every family has a story worth keeping.</h1><p>Connect with loved ones and keep meaningful memories in one respectful, private space.</p></div>
        <div className="auth-panel-foot">A thoughtful place for the people who matter.</div>
      </div>
      <div className="auth-form-panel"><Link to="/" className="back-home">← Back to website</Link><PageContent page={page}/></div>
    </div>
  )
}

function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow || 'PERSONALHUB'}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>
}

function PageContent({ page }) {
  switch (page.kind) {
    case 'home': return <HomePage />
    case 'about': return <AboutPage />
    case 'family': return <FamilyPage />
    case 'tree': return <TreePage />
    case 'gallery': return <GalleryPage page={page}/>
    case 'posts': return <PostsPage page={page}/>
    case 'family-feed': return <FamilyFeedPage />
    case 'contact': return <ContactPage />
    case 'login': return <LoginPage />
    case 'register': return <RegisterPage />
    case 'forgot': return <ForgotPage />
    case 'account': return <AccountPage />
    case 'dashboard': return <DashboardHome page={page}/>
    case 'profile': return <ProfilePage page={page}/>
    case 'members': return <MembersPage page={page}/>
    case 'users': return <UsersPage />
    case 'albums': return <AlbumsPage page={page}/>
    case 'invitations': return <InvitationsPage />
    case 'approvals': return <ApprovalsPage />
    case 'reports': return <ReportsPage />
    case 'activity': return <ActivityPage />
    case 'website-settings': return <WebsiteSettingsPage />
    case 'privacy': return <PrivacyPage />
    case 'create-post': return <CreatePostPage />
    case 'upload': return <UploadPage />
    case 'status': return <StatusPage />
    case 'settings': return <SettingsPage />
    default: return <GenericPage page={page}/>
  }
}

function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy"><span className="eyebrow light-eyebrow">A PLACE TO BELONG</span><h1>Our roots make us.<br/><em>Our stories connect us.</em></h1><p>Welcome to our family corner — a place to celebrate our journey, remember special moments and keep our stories close.</p><div className="hero-actions"><Link to="/family" className="btn btn-gold">Discover our family <ArrowRight size={17}/></Link><Link to="/about" className="btn btn-glass">Our story</Link></div><div className="hero-note"><ShieldCheck size={16}/> Personal information is shared with care and permission.</div></div>
        <div className="hero-photo"><div className="photo-caption"><span className="caption-dot"/> OUR FAMILY, OUR LEGACY</div></div>
      </section>
      <section className="section-block welcome-section"><div className="welcome-text"><span className="eyebrow">WELCOME TO PERSONALHUB</span><h2>A little place for a lifetime of memories.</h2><p>PersonalHub brings together personal milestones, family connections and meaningful moments. Explore the stories that have been approved for sharing.</p><Link to="/about" className="text-link">Get to know us <ArrowRight size={16}/></Link></div><div className="welcome-stats"><StatCard value="Our story" label="Personal journey" icon={BookOpen}/><StatCard value="Together" label="Family connections" icon={UsersRound}/><StatCard value="Memories" label="Moments to treasure" icon={Images}/></div></section>
      <section className="section-block soft-section"><SectionTitle eyebrow="EXPLORE" title="A window into our world" text="Discover the parts of our story that are open to visitors."/><div className="feature-grid"><FeatureCard icon={UserRound} title="Personal story" text="Learn about the journey, interests and milestones." to="/about"/><FeatureCard icon={UsersRound} title="Our family" text="Meet family members whose profiles are approved for sharing." to="/family"/><FeatureCard icon={GitBranch} title="Family roots" text="Explore connections across generations." to="/family-tree"/><FeatureCard icon={Images} title="Photo memories" text="Browse selected moments from family life." to="/gallery"/></div></section>
      <section className="section-block"><SectionTitle eyebrow="LATEST STORIES" title="Stories worth remembering" text="Updates and reflections from our personal and family journey."/><PostCards/></section>
      <section className="join-banner"><div><span className="eyebrow light-eyebrow">FAMILY MEMBERS</span><h2>Some memories are just for us.</h2><p>Approved family members can sign in to access content shared privately with the family.</p></div><Link to="/login" className="btn btn-gold">Family member login <ArrowRight size={17}/></Link></section>
    </>
  )
}

function SectionTitle({ eyebrow, title, text }) {
  return <div className="section-title"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{text && <p>{text}</p>}</div>
}
function StatCard({ value, label, icon: Icon }) { return <div className="stat-card"><span className="stat-icon"><Icon size={19}/></span><strong>{value}</strong><small>{label}</small></div> }
function FeatureCard({ icon: Icon, title, text, to }) { return <Link to={to} className="feature-card"><span className="feature-icon"><Icon size={22}/></span><h3>{title}</h3><p>{text}</p><span className="feature-link">Explore <ArrowUpRight size={15}/></span></Link> }
function PostCards() {
  const { publications } = useApp()
  const samples = [{tag:'PERSONAL STORY',title:'The moments that shape our journey',text:'A reflection on the experiences and lessons that make us who we are.'},{tag:'FAMILY NEWS',title:'Celebrating the connections we share',text:'A small collection of updates and moments from our family community.'},{tag:'MEMORIES',title:'Keeping meaningful memories close',text:'Why preserving stories and photographs can matter for generations.'}]
  const items = [
    ...publications.filter(item => item.visibility === 'public' && item.status === 'published').map(item => ({
      ...item, tag: item.category.toUpperCase(), text: item.summary
    })),
    ...samples
  ].slice(0, 3)
  return <div className="post-card-grid">{items.map((item,i)=><article className="post-card" key={item.id || item.title}><div className={`post-visual post-visual-${i+1}`} style={item.image ? {backgroundImage:`linear-gradient(0deg,rgba(10,30,53,.35),transparent 40%),url("${item.image}")`,backgroundSize:'cover',backgroundPosition:'center'} : undefined}><span>{item.tag}</span></div><div className="post-card-body"><small>{item.tag}</small><h3>{item.title}</h3><p>{item.text}</p><Link to={item.id&&!String(item.id).startsWith('sample-')?`/publications/${item.id}`:'/publications'} className="text-link">Read story <ArrowRight size={15}/></Link></div></article>)}</div>
}

function AboutPage() {
  return <div className="public-page-wrap"><PageHeading eyebrow="A PERSONAL INTRODUCTION" title="About Me" description="A little about the person behind this space."/><div className="about-layout"><div className="portrait-placeholder"><UserRound size={70}/><span>Profile portrait</span></div><div className="about-copy"><span className="eyebrow">MY STORY</span><h2>Every journey is made of moments.</h2><p>This page is a place to introduce myself, share selected milestones and reflect on the experiences that have shaped my journey.</p><p>Use the profile editor to add a biography, education, interests and achievements. Only information marked public will appear here.</p><div className="info-pills"><span>Personal journey</span><span>Learning</span><span>Family</span></div><Link to="/login" className="btn btn-primary">Family member access</Link></div></div><SectionTitle eyebrow="THE DETAILS" title="A few things about me"/><div className="feature-grid three"><FeatureCard icon={BookOpen} title="Education" text="Add approved education highlights and learning milestones." to="/login"/><FeatureCard icon={Sparkles} title="Interests" text="Share hobbies, interests and the things that inspire me." to="/login"/><FeatureCard icon={CheckCircle2} title="Achievements" text="Highlight meaningful personal and professional milestones." to="/login"/></div></div>
}

function FamilyPage() {
  const [members,setMembers]=useState([])
  const [error,setError]=useState('')
  useEffect(()=>{
    let active=true
    loadFamilyMembers()
      .then(items=>{if(active)setMembers(items)})
      .catch(loadError=>{
        console.error('Could not load family profiles:',loadError)
        if(active)setError(loadError.message)
      })
    return ()=>{active=false}
  },[])
  return <div className="public-page-wrap"><PageHeading eyebrow="THE PEOPLE WHO MATTER" title="Our Family" description="Family profiles shared with this audience."/><div className="family-intro"><UsersRound size={25}/><p>Family members choose which details and photographs they share. Private profiles are not shown here.</p></div>{error&&<p className="form-error" role="alert">{error}</p>}<div className="member-grid">{members.map((member,i)=><div className="member-card" key={member.id}><div className={`member-avatar member-${i%4+1}`}><ProfileAvatar image={member.image} name={member.fullName}/></div><div className="member-card-body"><span className="eyebrow">FAMILY PROFILE</span><h3>{member.fullName}</h3><p>{member.biography || 'This family member has not added an introduction yet.'}</p><span className="privacy-chip"><Globe2 size={12}/> {member.visibility === 'public' ? 'Public profile' : 'Family profile'}</span></div></div>)}</div>{!members.length&&!error&&<EmptyState text="No profiles have been shared with this audience yet."/>}<div className="center-action"><Link to="/login" className="btn btn-outline">Family member login</Link></div></div>
}

function ProfileAvatar({ image, name, className = '' }) {
  return image
    ? <img className={`profile-avatar-image ${className}`} src={image} alt={`${name || 'Member'}'s profile`} />
    : <span className={`profile-avatar-fallback ${className}`}><UserRound size={24}/></span>
}

function TreePage() {
  return <div className="public-page-wrap"><PageHeading eyebrow="OUR ROOTS" title="Family Tree" description="Explore family connections that have been approved for sharing."/><div className="tree-card"><div className="tree-legend"><span><i className="legend-dot gold-dot"/> Older generation</span><span><i className="legend-dot blue-dot"/> Family members</span></div><div className="tree-diagram"><div className="tree-node elder"><UserRound/><strong>Generation One</strong><small>Family roots</small></div><div className="tree-stem"/><div className="tree-branches"><div className="tree-node"><UserRound/><strong>Family branch A</strong><small>Profile approved</small></div><div className="tree-node"><UserRound/><strong>Family branch B</strong><small>Profile approved</small></div></div><div className="tree-stem short"/><div className="tree-branches younger"><div className="tree-node"><UserRound/><strong>Next generation</strong><small>Private details hidden</small></div><div className="tree-node"><UserRound/><strong>Next generation</strong><small>Private details hidden</small></div><div className="tree-node"><UserRound/><strong>Next generation</strong><small>Private details hidden</small></div></div></div><p className="tree-note"><LockKeyhole size={15}/> Some family relationships and profiles may be restricted to approved family members.</p></div></div>
}

const galleryItems = ['Family gathering','A special celebration','Time together','A memorable day','Family traditions','Shared moments']
function GalleryPage({ page }) {
  const [filter,setFilter] = useState('All')
  const { notify, photos } = useApp()
  const visiblePhotos = photos.filter(photo => (
    (page.area || photo.visibility === 'public') &&
    (filter === 'All' || photo.album === filter)
  ))
  return <div className={page.area ? '' : 'public-page-wrap'}><PageHeading eyebrow="PHOTO MEMORIES" title={page.area ? 'Family Gallery' : 'Photo Gallery'} description="A curated collection of photographs approved for this audience." action={page.area ? <Link className="btn btn-primary" to="/editor/upload-photos"><Upload size={16}/> Upload photo</Link> : null}/><div className="filter-row"><div className="filter-tabs">{['All','Gatherings','Celebrations','Traditions'].map(f=><button key={f} className={filter===f?'filter-tab active':'filter-tab'} onClick={()=>setFilter(f)}>{f}</button>)}</div><span className="muted small-text"><LockKeyhole size={13}/> Private albums require family access</span></div><div className="gallery-grid">{visiblePhotos.map(photo=><button className="gallery-tile" key={photo.id} style={{backgroundImage:`url("${photo.image}")`,backgroundSize:'cover',backgroundPosition:'center'}} onClick={()=>notify(photo.caption || 'Family photo')}><span className="gallery-tile-icon"><Camera size={22}/></span><span className="gallery-tile-caption">{photo.caption || 'Family photo'}<small>{photo.album}</small></span></button>)}{galleryItems.map((item,i)=><button className={`gallery-tile gallery-tile-${i+1}`} key={item} onClick={()=>notify(`${item}: sample gallery preview`)}><span className="gallery-tile-icon"><Camera size={22}/></span><span className="gallery-tile-caption">{item}<small>{filter === 'All' ? ['Gatherings','Celebrations','Traditions'][i%3] : filter}</small></span></button>)}</div></div>
}

function PostsPage({ page }) {
  const { publications } = useApp()
  const sampleItems = ['The moments that shape our journey','Celebrating the connections we share','Keeping meaningful memories close','A note about family traditions'].map((title,i)=>({
    id:`sample-${i}`,title,summary:'A short introduction to this story. Full content and audience permissions are managed by the content owner.',
    category:i%2?'Family news':'Personal story',visibility:i%2?'family':'public',status:i===0?'published':'sample'
  }))
  const items = page.area
    ? [...publications,...sampleItems]
    : [...publications.filter(item => item.visibility === 'public' && item.status === 'published'),...sampleItems.filter(item => item.visibility === 'public')]
  return <div className={page.area ? '' : 'public-page-wrap'}><PageHeading eyebrow="STORIES & UPDATES" title={page.area === 'family' ? 'Family News' : page.area === 'editor' ? 'My Publications' : page.area === 'admin' ? 'Manage Publications' : 'Publications'} description="Articles, announcements and stories shared with the right audience." action={page.area ? <Link className="btn btn-primary" to="/editor/create-publication"><Plus size={16}/> New publication</Link> : null}/><div className="publication-list">{items.map((item,i)=><article className="publication-row" key={item.id}><div className={`publication-thumb thumb-${i+1}`}>{item.image ? <img src={item.image} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : <FileText size={25}/>}</div><div className="publication-info"><span className="eyebrow">{item.category.toUpperCase()}</span><h3>{item.id && !String(item.id).startsWith('sample-') ? <Link to={`/publications/${item.id}`}>{item.title}</Link> : item.title}</h3><p>{item.summary}</p><small><CalendarDays size={13}/> {item.status==='published'?'Published':'Sample publication'} • {item.visibility}{item.commentsCount ? ` • ${item.commentsCount} comments` : ''}</small></div><span className={`status-pill ${item.status==='published'?'status-approved':'status-draft'}`}>{item.status==='published'?'Published':item.status==='draft'?'Draft':'Sample'}</span></article>)}</div></div>
}

function PublicationDetailPage() {
  const { publicationId } = useParams()
  const { user, notify } = useApp()
  const [publication,setPublication]=useState(null)
  const [comments,setComments]=useState([])
  const [authorName,setAuthorName]=useState('')
  const [content,setContent]=useState('')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  const [submitting,setSubmitting]=useState(false)
  useEffect(()=>{
    let active=true
    setLoading(true)
    loadPublication(publicationId)
      .then(article=>{
        if(active){setPublication(article);setError('')}
        if(article.visibility!=='public'||article.status!=='published')return []
        return loadPublicationComments(publicationId)
      })
      .then(items=>{
        if(active)setComments(items)
      })
      .catch(loadError=>{
        console.error('Could not load publication:',loadError)
        if(active)setError(loadError.message)
      })
      .finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false}
  },[publicationId])
  const submitComment=async event=>{
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result=await submitPublicationComment(publicationId,{authorName,content})
      setContent('')
      setAuthorName('')
      notify(result.message)
    } catch (submitError) {
      console.error('Could not submit article comment:',submitError)
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }
  if(loading)return <div className="public-page-wrap"><p>Loading article…</p></div>
  if(error&&!publication)return <div className="public-page-wrap"><PageHeading title="Article unavailable" description={error}/><Link to="/publications" className="btn btn-outline">Back to publications</Link></div>
  if(!publication)return <NotFound/>
  return <div className="public-page-wrap article-page"><Link to="/publications" className="text-link">← All publications</Link><PageHeading eyebrow={publication.category.toUpperCase()} title={publication.title} description={publication.summary}/>{publication.image&&<img className="article-image" src={publication.image} alt=""/>}<article className="article-content">{publication.content||publication.summary}</article>{publication.visibility==='public'&&publication.status==='published'&&<section className="article-comments"><SectionTitle eyebrow="COMMUNITY" title="Comments" text="Comments are reviewed before appearing publicly. Please keep your message respectful and avoid sensitive information."/><form className="form-card comment-form" onSubmit={submitComment}>{!user&&<Field label="Your name" placeholder="Name shown with your comment" value={authorName} onChange={event=>setAuthorName(event.target.value)} required/>}<Field label="Comment" placeholder="Write a comment..." textarea value={content} onChange={event=>setContent(event.target.value)} required/>{error&&<p className="form-error" role="alert">{error}</p>}<button className="btn btn-primary" type="submit" disabled={submitting}>{submitting?'Submitting…':'Submit for review'} <ArrowRight size={16}/></button></form><div className="comment-list">{comments.map(comment=><article className="comment-card" key={comment.id}><div><strong>{comment.author}</strong><time>{new Date(comment.createdAt).toLocaleDateString()}</time></div><p>{comment.content}</p></article>)}{!comments.length&&<EmptyState text="No approved comments yet. Be the first to share a thought."/>}</div></section>}</div>
}

function FamilyFeedPage() {
  const {notify,user}=useApp()
  const [posts,setPosts]=useState([])
  const [draft,setDraft]=useState('')
  const [replies,setReplies]=useState({})
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  const [submitting,setSubmitting]=useState(false)
  useEffect(()=>{
    let active=true
    loadFamilyFeed()
      .then(items=>{if(active)setPosts(items)})
      .catch(loadError=>{
        console.error('Could not load family feed:',loadError)
        if(active)setError(loadError.message)
      })
      .finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false}
  },[])
  const submitPost=async event=>{
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const post=await createFamilyPost(draft)
      setPosts(current=>[post,...current])
      setDraft('')
      notify('Shared with your family.')
    } catch (submitError) {
      console.error('Could not publish family post:',submitError)
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }
  const submitReply=async(postId,event)=>{
    event.preventDefault()
    const content=replies[postId]||''
    if(!content.trim())return
    setError('')
    try {
      const comment=await createFamilyComment(postId,content)
      setPosts(current=>current.map(post=>post.id===postId?{...post,comments:[...post.comments,comment]}:post))
      setReplies(current=>({...current,[postId]:''}))
    } catch (submitError) {
      console.error('Could not add family comment:',submitError)
      setError(submitError.message)
    }
  }
  return <div className="family-feed"><PageHeading eyebrow="FAMILY COMMUNITY" title="Family Feed" description="Share updates and keep the conversation within your approved family community."/><form className="panel-card feed-compose" onSubmit={submitPost}><div className="feed-compose-heading"><ProfileAvatar image={user?.image} name={user?.fullName}/><strong>Share an update</strong></div><textarea value={draft} onChange={event=>setDraft(event.target.value)} maxLength={2000} rows="3" placeholder="What would you like to share with your family?" required/><div className="feed-compose-actions"><small>{draft.length}/2000</small><button className="btn btn-primary" type="submit" disabled={submitting}>{submitting?'Sharing…':'Share with family'} <ArrowRight size={16}/></button></div></form>{error&&<p className="form-error" role="alert">{error}</p>}{loading?<p>Loading family updates…</p>:<div className="feed-post-list">{posts.map(post=><article className="panel-card feed-post" key={post.id}><header><ProfileAvatar image={post.image} name={post.author}/><div><strong>{post.author}</strong><time>{new Date(post.createdAt).toLocaleString()}</time></div></header><p className="feed-post-content">{post.content}</p><div className="feed-replies">{post.comments.map(comment=><div className="feed-reply" key={comment.id}><ProfileAvatar image={comment.image} name={comment.author}/><div><strong>{comment.author}</strong><p>{comment.content}</p><time>{new Date(comment.createdAt).toLocaleString()}</time></div></div>)}</div><form className="feed-reply-form" onSubmit={event=>submitReply(post.id,event)}><input value={replies[post.id]||''} onChange={event=>setReplies(current=>({...current,[post.id]:event.target.value}))} maxLength={1000} placeholder="Write a family-only comment…" required/><button className="btn btn-outline btn-small" type="submit">Reply</button></form></article>)}{!posts.length&&<EmptyState text="No family updates yet. Share the first one above."/>}</div>}</div>
}

function ContactPage() {
  const { notify } = useApp()
  return <div className="public-page-wrap"><PageHeading eyebrow="GET IN TOUCH" title="Contact" description="Send a general enquiry about this website."/><div className="contact-layout"><div className="contact-info"><span className="contact-icon"><Mail size={24}/></span><h2>We welcome your message.</h2><p>Use this form for general website enquiries. Avoid including sensitive personal information.</p><div className="contact-line"><ShieldCheck size={18}/><span>Messages are for general enquiries only.</span></div></div><form className="form-card" onSubmit={e=>{e.preventDefault();notify('Demo message submitted. No email was sent.')}}><Field label="Your name" placeholder="Enter your name"/><Field label="Email address" type="email" placeholder="name@example.com"/><Field label="Subject" placeholder="How can we help?"/><Field label="Message" textarea placeholder="Write your message..."/><button className="btn btn-primary" type="submit">Send message <ArrowRight size={16}/></button></form></div></div>
}

function Field({ label, placeholder, type='text', textarea=false, value, onChange, required=false }) {
  return <label className="field"><span>{label}</span>{textarea ? <textarea placeholder={placeholder} rows="4" value={value} onChange={onChange} required={required}/> : <input type={type} placeholder={placeholder} value={value} onChange={onChange} required={required}/>}</label>
}

function LoginPage() {
  const { login } = useApp()
  const navigate = useNavigate()
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [error,setError] = useState('')
  const [submitting,setSubmitting] = useState(false)
  const handleSubmit = async event => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await login({ email, password })
      navigate(user.role === 'super_admin' ? '/admin' : user.role === 'editor' ? '/editor' : '/family-portal')
    } catch (requestError) {
      console.error('Sign-in failed:', requestError)
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }
  return <div className="auth-card"><span className="eyebrow">WELCOME BACK</span><h1>Sign in to PersonalHub</h1><p className="auth-subtitle">Use your approved family account.</p><form onSubmit={handleSubmit}><Field label="Email address" type="email" placeholder="you@example.com" value={email} onChange={event=>setEmail(event.target.value)} required/><Field label="Password" type="password" placeholder="Enter your password" value={password} onChange={event=>setPassword(event.target.value)} required/><div className="form-between"><span/><Link to="/forgot-password">Forgot password?</Link></div>{error&&<p className="form-error" role="alert">{error}</p>}<button className="btn btn-primary btn-full" type="submit" disabled={submitting}>{submitting?'Signing in…':'Sign in'} <ArrowRight size={16}/></button></form><p className="auth-bottom">Have an invitation? <Link to="/register">Create your account</Link></p></div>
}
function RegisterPage() {
  const { createAccount } = useApp()
  const navigate = useNavigate()
  const [fullName,setFullName] = useState('')
  const [email,setEmail] = useState('')
  const [invitationCode,setInvitationCode] = useState(() => new URLSearchParams(window.location.search).get('invite') || '')
  const [password,setPassword] = useState('')
  const [error,setError] = useState('')
  const [submitting,setSubmitting] = useState(false)
  const handleSubmit = async event => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await createAccount({ fullName, email, invitationCode, password })
      navigate('/family-portal')
    } catch (requestError) {
      console.error('Registration failed:', requestError)
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }
  return <div className="auth-card"><span className="eyebrow">FAMILY INVITATION</span><h1>Create your account</h1><p className="auth-subtitle">Registration requires a valid invitation sent to your email address.</p><form onSubmit={handleSubmit}><Field label="Full name" placeholder="Your full name" value={fullName} onChange={event=>setFullName(event.target.value)} required/><Field label="Email address" type="email" placeholder="you@example.com" value={email} onChange={event=>setEmail(event.target.value)} required/><Field label="Invitation code" placeholder="Enter your invitation code" value={invitationCode} onChange={event=>setInvitationCode(event.target.value)} required/><Field label="Create password" type="password" placeholder="At least 10 characters" value={password} onChange={event=>setPassword(event.target.value)} required/><label className="check-label"><input type="checkbox" required/> I understand that family content has access restrictions.</label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="btn btn-primary btn-full" type="submit" disabled={submitting}>{submitting?'Creating account…':'Submit registration'} <ArrowRight size={16}/></button></form><p className="auth-bottom">Already registered? <Link to="/login">Sign in</Link></p></div>
}
function ForgotPage() {
  return <div className="auth-card"><span className="eyebrow">ACCOUNT RECOVERY</span><h1>Password recovery</h1><p className="auth-subtitle">Email delivery is not configured. Please contact a PersonalHub administrator to reset your account.</p><p className="auth-bottom"><Link to="/login">← Back to login</Link></p></div>
}
function AccountPage() { return <ProfilePage page={{title:'My Account',area:'family'}}/> }

function DashboardHome({ page }) {
  const area = page.area
  const title = area==='admin'?'Admin Dashboard':area==='editor'?'Editor Dashboard':'Family Dashboard'
  const metrics = area==='admin'?[['24','User accounts',UsersRound],['12','Family profiles',UserRound],['8','Published stories',FileText],['5','Items to review',ShieldCheck]]:area==='editor'?[['6','My publications',FileText],['3','Published',CheckCircle2],['2','In review',Clock3],['4','Photo albums',Images]]:[['12','Family profiles',UsersRound],['8','Shared stories',BookOpen],['6','Photo albums',Images],['3','New updates',Bell]]
  return <><PageHeading eyebrow={area.toUpperCase()+' WORKSPACE'} title={title} description={`Welcome back. Here is an overview of your ${area==='family'?'family space':area==='admin'?'website':'content workspace'}.`}/><div className="metric-grid">{metrics.map(([n,l,I])=><div className="metric-card" key={l}><span className="metric-icon"><I size={20}/></span><strong>{n}</strong><span>{l}</span><small><ArrowUpRight size={13}/> Demo data</small></div>)}</div><div className="dashboard-panels"><div className="panel-card"><div className="panel-heading"><div><h3>Recent activity</h3><p>Latest updates in your workspace</p></div><button className="icon-btn"><MoreHorizontal/></button></div><ActivityRows/></div><div className="panel-card"><div className="panel-heading"><div><h3>Quick actions</h3><p>Common tasks</p></div></div><div className="quick-actions">{(area==='admin'?[['Invite a family member','/admin/invitations',Mail],['Review submissions','/admin/approvals',ShieldCheck],['Manage publications','/admin/publications',FileText]]:area==='editor'?[['Create publication','/editor/create-publication',Plus],['Upload photographs','/editor/upload-photos',Upload],['View publication status','/editor/publication-status',Clock3]]:[['View family members','/family-portal/members',UsersRound],['Explore family gallery','/family-portal/gallery',Images],['Open family feed','/family-portal/news',Newspaper]]).map(([label,to,I])=><Link to={to} className="quick-action" key={label}><I size={17}/><span>{label}</span><ChevronRight size={16}/></Link>)}</div></div></div><div className="privacy-banner"><ShieldCheck size={20}/><div><strong>Remember: family privacy matters</strong><p>Check the audience setting before publishing personal details, stories or photographs.</p></div><Link to={area==='admin'?'/admin/privacy':'/family-portal/settings'}>Review settings <ArrowRight size={15}/></Link></div></>
}
function ActivityRows() {
  return <div className="activity-list">{[['A family story was updated','Today • 10:30 AM',FileText],['A new photo album was created','Yesterday',Images],['A profile was reviewed','2 days ago',UserRound]].map(([a,b,I])=><div className="activity-row" key={a}><span className="activity-icon"><I size={16}/></span><div><strong>{a}</strong><small>{b}</small></div><span className="activity-dot"/></div>)}</div>
}

function ProfilePage({ page }) {
  const { user, setCurrentUser, notify } = useApp()
  const targetId = page.area === 'admin' ? new URLSearchParams(window.location.search).get('userId') : ''
  const [profile,setProfile]=useState(null)
  const [fullName,setFullName]=useState('')
  const [biography,setBiography]=useState('')
  const [visibility,setVisibility]=useState('family')
  const [preview,setPreview]=useState('')
  const [imageData,setImageData]=useState('')
  const [removeImage,setRemoveImage]=useState(false)
  const [error,setError]=useState('')
  const [saving,setSaving]=useState(false)
  useEffect(()=>{
    let active=true
    loadProfile(targetId||undefined)
      .then(result=>{
        if(!active)return
        setProfile(result)
        setFullName(result.user.fullName)
        setBiography(result.biography)
        setVisibility(result.visibility)
        setPreview(result.image||'')
      })
      .catch(loadError=>{
        console.error('Could not load profile:',loadError)
        if(active)setError(loadError.message)
      })
    return ()=>{active=false}
  },[targetId])
  const handleImageChange=async event=>{
    const file=event.target.files?.[0]
    if(!file)return
    try {
      const data=await readImageFile(file)
      setImageData(data)
      setPreview(data)
      setRemoveImage(false)
    } catch (imageError) {
      console.error('Could not read profile photo:',imageError)
      setError(imageError.message)
      event.target.value=''
    }
  }
  const handleSave=async event=>{
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const result=await updateProfile({fullName,biography,visibility,image:imageData,removeImage},targetId||undefined)
      setProfile(result)
      setFullName(result.user.fullName)
      setBiography(result.biography)
      setVisibility(result.visibility)
      setPreview(result.image||'')
      setImageData('')
      setRemoveImage(false)
      if(!targetId||String(user.id)===String(result.user.id))setCurrentUser(result.user)
      notify('Profile saved.')
    } catch (saveError) {
      console.error('Could not save profile:',saveError)
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }
  return <><PageHeading eyebrow="PROFILE MANAGEMENT" title={targetId?'Edit family profile':page.title} description="Update the profile information and photo shared with your chosen audience."/><form className="profile-layout" onSubmit={handleSave}><div className="panel-card profile-summary"><div className="avatar avatar-large"><ProfileAvatar image={preview} name={fullName}/></div><h3>{fullName||'Family member'}</h3><p>{profile?.user?.email}</p><label className="btn btn-outline profile-photo-picker">Choose profile photo<input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImageChange}/></label>{preview&&<button type="button" className="text-button" onClick={()=>{setPreview('');setImageData('');setRemoveImage(true)}}>Remove photo</button>}<div className="profile-summary-note"><LockKeyhole size={15}/> Your profile photo and introduction follow the selected visibility.</div></div><div className="panel-card"><h3 className="form-section-title">Basic information</h3><Field label="Display name" placeholder="Your display name" value={fullName} onChange={event=>setFullName(event.target.value)} required/><label className="field"><span>Email address</span><input type="email" value={profile?.user?.email||''} readOnly/></label><Field label="Short introduction" placeholder="A little about yourself" textarea value={biography} onChange={event=>setBiography(event.target.value)}/><label className="field"><span>Profile visibility</span><select value={visibility} onChange={event=>setVisibility(event.target.value)}><option value="public">Public — everyone</option><option value="family">Family — approved members</option><option value="private">Private — only you and administrators</option></select></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="btn btn-primary" type="submit" disabled={saving||!profile}>{saving?'Saving…':'Save profile'} <CheckCircle2 size={16}/></button></div></form></>
}
function VisibilitySelect() { const [v,setV]=useState('private'); return <label className="field visibility-field"><span>Who can view this profile?</span><select value={v} onChange={e=>setV(e.target.value)}><option value="public">Public — everyone</option><option value="family">Family — approved members</option><option value="private">Private — only me and authorized admins</option></select></label> }

function MembersPage({ page }) {
  const [members,setMembers]=useState([])
  const [error,setError]=useState('')
  const [search,setSearch]=useState('')
  useEffect(()=>{
    let active=true
    loadFamilyMembers()
      .then(items=>{if(active)setMembers(items)})
      .catch(loadError=>{
        console.error('Could not load family members:',loadError)
        if(active)setError(loadError.message)
      })
    return ()=>{active=false}
  },[])
  const list=members.filter(member=>member.fullName.toLowerCase().includes(search.toLowerCase()))
  return <><PageHeading eyebrow="PEOPLE & CONNECTIONS" title={page.area==='admin'?'Manage Family Members':page.area==='editor'?'Family Profiles':'Family Members'} description="View profiles and photos shared with your account." action={page.area==='admin'?<Link className="btn btn-primary" to="/admin/invitations"><Plus size={16}/> Invite family member</Link>:null}/><div className="toolbar"><div className="search-box"><Search size={17}/><input placeholder="Search family members..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>{error&&<p className="form-error" role="alert">{error}</p>}<div className="member-grid dashboard-member-grid">{list.map((member,i)=><div className="member-card" key={member.id}><div className={`member-avatar member-${i%4+1}`}><ProfileAvatar image={member.image} name={member.fullName}/></div><div className="member-card-body"><span className="eyebrow">FAMILY MEMBER</span><h3>{member.fullName}</h3><p>{member.biography||'No introduction has been added.'}</p><span className="status-pill status-approved">{member.visibility}</span>{page.area==='admin'&&<Link className="text-link member-edit-link" to={`/admin/personal-profile?userId=${encodeURIComponent(member.id)}`}>Edit profile <Pencil size={14}/></Link>}</div></div>)}</div>{!list.length&&!error&&<EmptyState text="No matching family members found."/>}</>
}
function UsersPage() {
  const [query,setQuery]=useState('')
  const { notify }=useApp()
  const rows=[['Alex Morgan','alex@example.com','Family Member','Active'],['Jordan Lee','jordan@example.com','Editor','Active'],['Taylor Kim','taylor@example.com','Family Member','Pending'],['Sam Rivera','sam@example.com','Family Member','Disabled']]
  return <><PageHeading eyebrow="ACCOUNT MANAGEMENT" title="Manage Users" description="Review account access and role assignments." action={<button className="btn btn-primary" onClick={()=>notify('Create user is a frontend demo action.')}><Plus size={16}/> Add user</button>}/><div className="toolbar"><div className="search-box"><Search size={17}/><input placeholder="Search name or email..." value={query} onChange={e=>setQuery(e.target.value)}/></div><button className="btn btn-outline btn-small"><Filter size={15}/> Filters</button></div><DataTable headers={['User','Email','Role','Status','Actions']} rows={rows.filter(r=>r.join(' ').toLowerCase().includes(query.toLowerCase())).map(r=>[<strong>{r[0]}</strong>,r[1],r[2],<span className={`status-pill ${r[3]==='Active'?'status-approved':r[3]==='Pending'?'status-pending':'status-muted'}`}>{r[3]}</span>,<RowActions/>])}/></>
}
function RowActions() { const {notify}=useApp(); return <div className="row-actions"><button title="View" onClick={()=>notify('Preview details opened.')}><Eye size={16}/></button><button title="Edit" onClick={()=>notify('Edit action is a demo.')}><Pencil size={16}/></button><button title="More" onClick={()=>notify('More actions are a demo.')}><MoreHorizontal size={16}/></button></div> }
function DataTable({headers,rows}) { return <div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length?rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>):<tr><td colSpan={headers.length}>No records found.</td></tr>}</tbody></table></div> }

function AlbumsPage({page}) {
  const {notify}=useApp()
  const albums=['Family celebrations','Everyday moments','Family traditions','Special gatherings']
  return <><PageHeading eyebrow="PHOTO ORGANIZATION" title={page.area==='editor'?'Manage Albums':'Manage Albums'} description="Organize approved photographs into meaningful collections." action={<button className="btn btn-primary" onClick={()=>notify('Create album dialog is a demo.')}><Plus size={16}/> Create album</button>}/><div className="album-grid">{albums.map((a,i)=><div className="album-card" key={a}><div className={`album-cover album-${i+1}`}><Images size={30}/></div><div className="album-info"><strong>{a}</strong><small>{[12,8,6,4][i]} sample photos</small><RowActions/></div></div>)}</div></>
}
function InvitationsPage() {
  const {notify}=useApp()
  const [email,setEmail]=useState('')
  const [history,setHistory]=useState([])
  const [inviteUrl,setInviteUrl]=useState('')
  const [error,setError]=useState('')
  const [submitting,setSubmitting]=useState(false)
  useEffect(()=>{
    let active=true
    loadInvitations()
      .then(items=>{if(active)setHistory(items)})
      .catch(loadError=>{
        console.error('Could not load invitations:',loadError)
        if(active)setError(loadError.message)
      })
    return ()=>{active=false}
  },[])
  const createInvite=async event=>{
    event.preventDefault()
    setError('')
    setInviteUrl('')
    setSubmitting(true)
    try {
      const {token}=await createInvitation(email)
      setInviteUrl(`${window.location.origin}/register?invite=${encodeURIComponent(token)}`)
      setEmail('')
      setHistory(await loadInvitations())
      notify('Invitation created. Share the link securely with the invited person.')
    } catch (requestError) {
      console.error('Could not create invitation:',requestError)
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }
  const rows=history.map(invitation=>[
    invitation.email,
    'Family Member',
    <span className={`status-pill ${invitation.acceptedAt?'status-approved':'status-pending'}`}>{invitation.acceptedAt?'Accepted':new Date(invitation.expiresAt).getTime()<Date.now()?'Expired':'Pending'}</span>,
    new Date(invitation.expiresAt).toLocaleDateString()
  ])
  return <><PageHeading eyebrow="FAMILY ACCESS" title="Family Invitations" description="Create single-use invitations for trusted family members."/><div className="panel-card invite-panel"><div className="invite-illustration"><Mail size={32}/></div><form onSubmit={createInvite}><h3>Invite a family member</h3><p>Invitation links expire after seven days and can only be used for the invited email address. Email delivery is not configured; share the link securely.</p><Field label="Email address" type="email" placeholder="family@example.com" value={email} onChange={event=>setEmail(event.target.value)} required/>{error&&<p className="form-error" role="alert">{error}</p>}{inviteUrl&&<label className="field"><span>Invitation link — copy and share securely</span><input value={inviteUrl} readOnly onFocus={event=>event.target.select()}/></label>}<button className="btn btn-primary" type="submit" disabled={submitting}>{submitting?'Creating…':'Create invitation'} <ArrowRight size={16}/></button></form></div><SectionTitle eyebrow="INVITATION HISTORY" title="Recent invitations"/><DataTable headers={['Email','Role','Status','Expiry']} rows={rows}/></>
}
function ApprovalsPage() {
  const {notify}=useApp()
  const [comments,setComments]=useState([])
  const [error,setError]=useState('')
  useEffect(()=>{
    let active=true
    loadPendingPublicationComments()
      .then(items=>{if(active)setComments(items)})
      .catch(loadError=>{
        console.error('Could not load comments for moderation:',loadError)
        if(active)setError(loadError.message)
      })
    return ()=>{active=false}
  },[])
  const moderate=async(id,status)=>{
    setError('')
    try {
      await moderatePublicationComment(id,status)
      setComments(current=>current.filter(comment=>comment.id!==id))
      notify(status==='approved'?'Comment approved and published.':'Comment rejected.')
    } catch (moderationError) {
      console.error('Could not moderate comment:',moderationError)
      setError(moderationError.message)
    }
  }
  const rows=comments.map(comment=>[
    <><strong>{comment.authorName}</strong><p>{comment.content}</p><small>On: {comment.postTitle}</small></>,
    new Date(comment.createdAt).toLocaleString(),
    <span className="status-pill status-pending">Pending</span>,
    <div className="moderation-actions"><button className="btn btn-primary btn-small" onClick={()=>moderate(comment.id,'approved')}>Approve</button><button className="btn btn-outline btn-small" onClick={()=>moderate(comment.id,'rejected')}>Reject</button></div>
  ])
  return <><PageHeading eyebrow="CONTENT REVIEW" title="Approvals & Moderation" description="Review visitor comments before they appear publicly."/><div className="approval-callout"><ShieldCheck size={20}/><div><strong>Comments are private until approved</strong><p>Review each comment for consent, safety and personal information before publishing it.</p></div></div>{error&&<p className="form-error" role="alert">{error}</p>}<DataTable headers={['Comment','Submitted','Status','Review']} rows={rows}/></>
}
function ReportsPage() {
  return <><PageHeading eyebrow="WEBSITE INSIGHTS" title="Reports & Analytics" description="A sample overview of website activity. Real metrics will be connected later."/><div className="metric-grid"><div className="metric-card"><strong>1,240</strong><span>Public page views</span><small>Sample data</small></div><div className="metric-card"><strong>24</strong><span>Registered accounts</span><small>Sample data</small></div><div className="metric-card"><strong>18</strong><span>Published items</span><small>Sample data</small></div><div className="metric-card"><strong>7</strong><span>Pending reviews</span><small>Sample data</small></div></div><div className="panel-card chart-card"><div className="panel-heading"><div><h3>Content activity</h3><p>Illustrative activity by month</p></div></div><div className="bar-chart">{[35,52,43,70,57,86,63,92,74,58,80,66].map((v,i)=><div className="bar-column" key={i}><div style={{height:`${v}%`}}/><small>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}</small></div>)}</div></div></>
}
function ActivityPage() {
  return <><PageHeading eyebrow="ACCOUNTABILITY" title="Activity Logs" description="A sample audit trail of important administrative actions."/><DataTable headers={['Activity','User','Date','Result']} rows={[['Updated a family profile','Admin','Today, 10:30 AM','Success'],['Reviewed a publication','Editor','Yesterday','Success'],['Created an album','Admin','2 days ago','Success'],['Changed visibility setting','Admin','3 days ago','Success']] .map(r=>[r[0],r[1],r[2],<span className="status-pill status-approved">{r[3]}</span>])}/></>
}
function WebsiteSettingsPage() {
  const {notify}=useApp()
  return <><PageHeading eyebrow="SITE CONFIGURATION" title="Website Settings" description="Configure public website details and presentation."/><div className="panel-card settings-card"><h3>General information</h3><div className="form-grid"><Field label="Website name" placeholder="PersonalHub"/><Field label="Tagline" placeholder="Our story • Our family • Our memories"/><Field label="Public contact email" type="email" placeholder="contact@example.com"/><Field label="Footer text" placeholder="© PersonalHub"/></div><h3 className="form-section-title">Website appearance</h3><div className="setting-row"><div><strong>Show public publications</strong><small>Display posts marked as public.</small></div><Toggle/></div><div className="setting-row"><div><strong>Show public family profiles</strong><small>Only approved public profiles can appear.</small></div><Toggle/></div><button className="btn btn-primary" onClick={()=>notify('Settings saved in this demo view only.')}>Save settings</button></div></>
}
function PrivacyPage() {
  return <><PageHeading eyebrow="PROTECTING YOUR COMMUNITY" title="Privacy & Security" description="Review the controls that help protect personal and family information."/><div className="privacy-grid"><PrivacyCard icon={Eye} title="Content visibility" text="Every profile, post, album and photo should have an audience: Public, Family or Private."/><PrivacyCard icon={ShieldCheck} title="Approval workflow" text="New family content can require review before it is published or shared."/><PrivacyCard icon={LockKeyhole} title="Account security" text="Use strong passwords, secure sessions and limited administrator access."/><PrivacyCard icon={History} title="Audit history" text="Record important account, permission and content changes."/><PrivacyCard icon={UsersRound} title="Family consent" text="Get permission before publishing another person's profile, story or photograph."/><PrivacyCard icon={BabySafeIcon} title="Children's privacy" text="Avoid publishing children's identifying details, school information or live locations."/><div className="privacy-warning"><LockKeyhole size={19}/><div><strong>Prototype reminder</strong><p>These are interface controls only. Enforce every permission in the backend before real family data is uploaded.</p></div></div></div></>
}
function BabySafeIcon(props) { return <ShieldCheck {...props}/> }
function PrivacyCard({icon:Icon,title,text}) { return <div className="privacy-card"><span><Icon size={20}/></span><div><strong>{title}</strong><p>{text}</p></div></div> }
function Toggle() { const [on,setOn]=useState(true); return <button className={`toggle ${on?'on':''}`} onClick={()=>setOn(!on)} aria-label="Toggle setting"><i/></button> }

function readImageFile(file) {
  if (!['image/jpeg','image/png','image/gif','image/webp'].includes(file.type)) return Promise.reject(new Error('Choose a JPEG, PNG, GIF or WebP image.'))
  if (file.size > 10 * 1024 * 1024) return Promise.reject(new Error('Images must be 10 MB or smaller.'))

  return new Promise((resolve,reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Could not read the selected image.'))
    reader.onerror = () => reject(reader.error || new Error('Could not read the selected image.'))
    reader.readAsDataURL(file)
  })
}

function CreatePostPage() {
  const {notify,addPublication}=useApp()
  const [title,setTitle]=useState('')
  const [category,setCategory]=useState('Personal story')
  const [visibility,setVisibility]=useState('public')
  const [summary,setSummary]=useState('')
  const [content,setContent]=useState('')
  const [image,setImage]=useState('')
  const [imageName,setImageName]=useState('')
  const handleImageChange=async event=>{
    const file=event.target.files?.[0]
    if(!file) return
    try {
      setImage(await readImageFile(file))
      setImageName(file.name)
    } catch(error) {
      console.error('Could not read publication image:',error)
      notify(error.message)
      event.target.value=''
    }
  }
  const savePost=async status=>{
    try {
      await addPublication({
        id:`post-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title,category,visibility,summary,content,image,
        status,createdAt:new Date().toISOString()
      })
      notify(status==='published'?'Publication is now visible on the public pages.':'Draft saved to the backend.')
    } catch(error) {
      console.error('Could not save publication:',error)
      notify('Could not save the publication. Please try again.')
    }
  }
  return <><PageHeading eyebrow="CONTENT STUDIO" title="Create Publication" description="Draft a story or announcement and select its intended audience."/><form className="panel-card editor-form" onSubmit={event=>{event.preventDefault();savePost(visibility==='public'?'published':'draft')}}><Field label="Publication title" placeholder="Enter a clear title" value={title} onChange={event=>setTitle(event.target.value)} required/><div className="form-grid"><label className="field"><span>Category</span><select value={category} onChange={event=>setCategory(event.target.value)}><option>Personal story</option><option>Family news</option><option>Announcement</option><option>Memory</option></select></label><label className="field"><span>Visibility</span><select value={visibility} onChange={event=>setVisibility(event.target.value)}><option value="private">Private — only authorized people</option><option value="family">Family — approved family members</option><option value="public">Public — everyone</option></select></label></div><Field label="Short summary" placeholder="Write a short introduction..." textarea value={summary} onChange={event=>setSummary(event.target.value)} required/><Field label="Full content" placeholder="Write your story here..." textarea value={content} onChange={event=>setContent(event.target.value)}/><label className="field"><span>Image (optional)</span><input type="file" accept="image/*" onChange={handleImageChange}/><small>{imageName || 'Choose an image up to 10 MB.'}</small></label><div className="editor-actions"><button type="button" className="btn btn-outline" onClick={()=>savePost('draft')}>Save draft</button><button className="btn btn-primary" type="submit">{visibility==='public'?'Publish publicly':'Save for review'} <ArrowRight size={16}/></button></div></form></>
}
function UploadPage() {
  const {notify,addPhoto}=useApp()
  const [file,setFile]=useState(null)
  const [image,setImage]=useState('')
  const [album,setAlbum]=useState('Celebrations')
  const [visibility,setVisibility]=useState('family')
  const [caption,setCaption]=useState('')
  const handleImageChange=async event=>{
    const selected=event.target.files?.[0]
    if(!selected) return
    try {
      setImage(await readImageFile(selected))
      setFile(selected)
    } catch(error) {
      console.error('Could not read gallery image:',error)
      notify(error.message)
      event.target.value=''
    }
  }
  const savePhoto=async event=>{
    event.preventDefault()
    const form=event.currentTarget
    if(!file || !image) {
      notify('Choose a photo first.')
      return
    }
    try {
      await addPhoto({
        id:`photo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        image,caption,album,visibility,createdAt:new Date().toISOString()
      })
      notify(visibility==='public'?'Photo is now visible in the public gallery.':'Photo saved to the backend.')
      setFile(null)
      setImage('')
      setCaption('')
      form.reset()
    } catch(error) {
      console.error('Could not save gallery photo:',error)
      notify('Could not save the photo. Please try again.')
    }
  }
  return <><PageHeading eyebrow="MEDIA LIBRARY" title="Upload Photographs" description="Add a photograph to the family gallery and choose who can see it."/><form className="panel-card upload-card" onSubmit={savePhoto}><label className="upload-drop"><ImagePlus size={38}/><strong>{file?.name||'Choose a photograph'}</strong><span>Image files up to 10 MB are uploaded to the backend.</span><input type="file" accept="image/*" onChange={handleImageChange}/></label><div className="form-grid"><label className="field"><span>Album</span><select value={album} onChange={event=>setAlbum(event.target.value)}><option value="Gatherings">Family gatherings</option><option value="Celebrations">Family celebrations</option><option value="Traditions">Family traditions</option></select></label><label className="field"><span>Audience</span><select value={visibility} onChange={event=>setVisibility(event.target.value)}><option value="family">Family only</option><option value="private">Private</option><option value="public">Public</option></select></label></div><Field label="Photo caption" placeholder="Add a caption (avoid sensitive details)" value={caption} onChange={event=>setCaption(event.target.value)}/><button className="btn btn-primary" type="submit"><Upload size={16}/> Save photo</button></form></>
}
function StatusPage() {
  return <><PageHeading eyebrow="CONTENT STUDIO" title="Publication Status" description="Track the review and publishing state of your submissions."/><DataTable headers={['Publication','Submitted','Audience','Status']} rows={[['A personal reflection','Today','Private',<span className="status-pill status-draft">Draft</span>],['Family gathering update','Yesterday','Family',<span className="status-pill status-pending">In review</span>],['A learning milestone','Last week','Public',<span className="status-pill status-approved">Published</span>]]}/></>
}
function SettingsPage() {
  const {notify}=useApp()
  return <><PageHeading eyebrow="PERSONAL PREFERENCES" title="My Settings" description="Manage your account preferences and privacy choices."/><div className="panel-card settings-card"><h3>Notifications</h3><div className="setting-row"><div><strong>Family announcements</strong><small>Receive updates about family news.</small></div><Toggle/></div><div className="setting-row"><div><strong>Content review updates</strong><small>Receive updates when your submission is reviewed.</small></div><Toggle/></div><h3 className="form-section-title">Privacy</h3><VisibilitySelect/><button className="btn btn-primary" onClick={()=>notify('Preferences saved in demo view.')}>Save preferences</button></div></>
}
function GenericPage({page}) {
  const {notify}=useApp()
  return <><PageHeading eyebrow="PERSONALHUB WORKSPACE" title={page.title} description="Manage and review this section of your PersonalHub website."/><div className="panel-card empty-workspace"><span className="empty-icon"><page.icon size={30}/></span><h3>{page.title}</h3><p>This page is included in the 40-page prototype. Its layout and navigation are ready; connect the backend later to save and retrieve real records.</p><button className="btn btn-primary" onClick={()=>notify(`${page.title} is ready for backend integration.`)}>Explore page <ArrowRight size={16}/></button></div></>
}
function EmptyState({text}) { return <div className="empty-state"><Search size={24}/><p>{text}</p></div> }
function NotFound() { return <div className="not-found"><h1>Page not found</h1><p>The page may have moved or the address may be incorrect.</p><Link to="/" className="btn btn-primary">Return home</Link></div> }

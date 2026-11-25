import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Compass,
  Heart,
  Image,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Network,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  TreePine,
  Users,
  X,
} from "lucide-react";

const stories = [
  {
    category: "FAMILY STORY",
    date: "October 12, 2024",
    title: "The summer we all came home",
    text: "One long table, a garden full of cousins, and stories that somehow get better every time.",
    image:
      "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1000&q=85",
    size: "story-card-large",
  },
  {
    category: "FROM THE ARCHIVE",
    date: "September 04, 2024",
    title: "A letter from 1958",
    text: "A small glimpse into a very different world, found tucked inside Grandma's recipe book.",
    image:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=85",
    size: "",
  },
  {
    category: "MILESTONES",
    date: "August 21, 2024",
    title: "A new little branch",
    text: "Our family tree grew by two tiny feet this August. Meet the newest member of the Wood family.",
    image:
      "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=800&q=85",
    size: "",
  },
];

const familyMembers = [
  { name: "Eleanor Wood", relation: "Family historian", initials: "EW", tone: "rose" },
  { name: "James Wood", relation: "Family administrator", initials: "JW", tone: "green" },
  { name: "Clara Bennett", relation: "A Wood by heart", initials: "CB", tone: "blue" },
  { name: "Oliver Wood", relation: "The next generation", initials: "OW", tone: "gold" },
];

const familyAccessNotice =
  "Family access is invitation-only. Sign-in is not configured, and no account details are submitted or stored here.";

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Families", icon: Network },
  { label: "Members", icon: Users },
  { label: "Stories", icon: BookOpen },
  { label: "Gallery", icon: Image },
];

function App() {
  const [dashboard, setDashboard] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Everyone");
  const [activeSide, setActiveSide] = useState("Overview");
  const [notice, setNotice] = useState("");

  const filteredStories = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const categoryNeedle = {
      "Family stories": "family story",
      "From the archive": "archive",
      Milestones: "milestones",
    }[activeFilter];
    return stories.filter((story) => {
      const matchesSearch = !needle || `${story.title} ${story.text} ${story.category}`.toLowerCase().includes(needle);
      const matchesCategory = !categoryNeedle || story.category.toLowerCase().includes(categoryNeedle);
      return matchesSearch && matchesCategory;
    });
  }, [activeFilter, query]);

  const announce = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  };

  const goTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main>
      {dashboard ? (
        <Dashboard
          activeSide={activeSide}
          setActiveSide={setActiveSide}
          onBack={() => setDashboard(false)}
          onNotice={announce}
        />
      ) : (
        <>
          <section className="hero" id="home">
            <div className="hero-image" />
            <header className="site-header page-shell">
              <button className="brand-lockup" onClick={() => goTo("home")} aria-label="The Wood family home">
                <span className="brand-mark"><TreePine size={23} strokeWidth={1.6} /></span>
                <span className="brand-name">the wood family<span>EST. 1905</span></span>
              </button>
              <button
                className="mobile-menu-button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
              >
                {menuOpen ? <X size={21} /> : <Menu size={21} />}
              </button>
              <nav className={menuOpen ? "main-nav is-open" : "main-nav"} aria-label="Main navigation">
                <button className="nav-link active" onClick={() => goTo("home")}>Home</button>
                <button className="nav-link" onClick={() => goTo("family")}>Family</button>
                <button className="nav-link" onClick={() => goTo("history")}>Our story</button>
                <button className="nav-link" onClick={() => goTo("stories")}>Stories</button>
                <button className="nav-link" onClick={() => goTo("gallery")}>Gallery</button>
                <button className="nav-register" onClick={() => announce(familyAccessNotice)}>
                  Family sign in <ArrowUpRight size={14} />
                </button>
                <button className="header-search" onClick={() => setSearchOpen((open) => !open)} aria-label="Search stories">
                  <Search size={19} />
                </button>
              </nav>
            </header>

            {searchOpen && (
              <div className="search-panel">
                <Search size={18} />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveFilter("Everyone");
                    goTo("stories");
                  }}
                  placeholder="Search our stories..."
                  aria-label="Search our stories"
                />
                <button onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={17} /></button>
              </div>
            )}

            <div className="hero-content page-shell">
              <span className="eyebrow hero-eyebrow"><span /> EVERY FAMILY HAS A STORY</span>
              <h1>This story begins<br />with all of us.</h1>
              <p className="hero-copy">A place for the people, moments, and memories<br className="desktop-break" /> that make our family ours.</p>
              <button className="button button-light" onClick={() => goTo("history")}>
                Explore our story <ArrowRight size={16} />
              </button>
              <button className="hero-scroll" onClick={() => goTo("welcome")} aria-label="Scroll to discover">
                <ArrowDown size={18} />
              </button>
            </div>
            <div className="hero-caption">THE WOOD FAMILY · TOGETHER SINCE 1905</div>
          </section>

          <section className="intro-section" id="welcome">
            <div className="page-shell intro-inner">
              <div className="intro-copy">
                <span className="eyebrow">ROOTED IN LOVE, GROWING TOGETHER</span>
                <h2>Our family is<br /><em>our greatest story.</em></h2>
                <p>Across generations and miles, we’ve gathered little moments into a life worth remembering. This is our place to keep those memories close—and make room for the ones still to come.</p>
                <button className="text-link" onClick={() => goTo("history")}>A little about us <ArrowRight size={16} /></button>
              </div>
              <div className="intro-photo-wrap">
                <img
                  src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1100&q=85"
                  alt="Three generations of a family sharing a happy moment"
                />
                <div className="photo-caption"><Heart size={14} fill="currentColor" /> A little more of us, every year.</div>
                <span className="photo-stamp">SINCE<br />1905</span>
              </div>
            </div>
          </section>

          <section className="family-section" id="family">
            <div className="page-shell">
              <div className="section-heading">
                <div><span className="eyebrow">THE PEOPLE WHO MAKE US</span><h2>Meet the family</h2></div>
                <button className="text-link" onClick={() => announce(familyAccessNotice)}>Visit the family directory <ArrowRight size={16} /></button>
              </div>
              <div className="family-grid">
                {familyMembers.map((member) => (
                  <button className="member-card" key={member.name} onClick={() => announce(`${member.name}’s profile is available to family members.`)}>
                    <span className={`member-avatar ${member.tone}`}>{member.initials}</span>
                    <span className="member-name">{member.name}</span>
                    <span className="member-relation">{member.relation}</span>
                    <ArrowUpRight className="member-arrow" size={16} />
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="tree-banner" id="history">
            <div className="tree-banner-image" />
            <div className="tree-banner-content page-shell">
              <span className="eyebrow">EVERY BRANCH HAS A BEGINNING</span>
              <h2>Where we come from<br />is part of who we are.</h2>
              <p>Follow the names, places, and stories that brought us here.</p>
              <button className="button button-light" onClick={() => announce(familyAccessNotice)}>
                Wander our family tree <ArrowRight size={16} />
              </button>
            </div>
            <span className="tree-banner-note">FIVE GENERATIONS · ONE BIG FAMILY</span>
          </section>

          <section className="stories-section" id="stories">
            <div className="page-shell">
              <div className="section-heading stories-heading">
                <div><span className="eyebrow">NOTES FROM OUR FAMILY</span><h2>Stories worth keeping</h2></div>
                <button className="text-link" onClick={() => announce(familyAccessNotice)}>All family stories <ArrowRight size={16} /></button>
              </div>
              <div className="stories-filter">
                {["Everyone", "Family stories", "From the archive", "Milestones"].map((filter) => (
                  <button
                    className={activeFilter === filter ? "filter-chip selected" : "filter-chip"}
                    key={filter}
                    onClick={() => {
                      setActiveFilter(filter);
                      setQuery("");
                    }}
                  >{filter}</button>
                ))}
              </div>
              <div className="story-grid">
                {filteredStories.length ? filteredStories.map((story) => (
                  <article className={`story-card ${story.size}`} key={story.title}>
                    <button className="story-image-button" onClick={() => announce(`Opening “${story.title}”`)}>
                      <img src={story.image} alt="" />
                      <span className="story-open"><ArrowUpRight size={17} /></span>
                    </button>
                    <div className="story-meta"><span>{story.category}</span><span>{story.date}</span></div>
                    <h3>{story.title}</h3>
                    <p>{story.text}</p>
                    <button className="story-read" onClick={() => announce(`“${story.title}” is available to family members.`)}>Read the story <ArrowRight size={14} /></button>
                  </article>
                )) : <div className="no-results">No stories found. Try another search.</div>}
              </div>
            </div>
          </section>

          <section className="gallery-section" id="gallery">
            <div className="page-shell gallery-inner">
              <div className="gallery-copy">
                <span className="eyebrow">LITTLE MOMENTS, KEPT FOREVER</span>
                <h2>Life, as we<br /><em>remember it.</em></h2>
                <p>Birthday candles, familiar places, and faces we love. A few snapshots from our shared album.</p>
                <button className="text-link" onClick={() => announce("The family photo album is available to invited members.")}>Visit our photo albums <ArrowRight size={16} /></button>
              </div>
              <div className="gallery-mosaic">
                <img className="gallery-img gallery-img-one" src="https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=750&q=85" alt="Family gathering outdoors" />
                <img className="gallery-img gallery-img-two" src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=650&q=85" alt="Family sharing a moment" />
                <img className="gallery-img gallery-img-three" src="https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=650&q=85" alt="Family camping together" />
                <div className="gallery-note"><Image size={16} /> THE FAMILY ALBUM <ArrowRight size={15} /></div>
              </div>
            </div>
          </section>

          <section className="join-section">
            <div className="join-flower">✳</div>
            <span className="eyebrow">THERE’S ALWAYS ROOM AT OUR TABLE</span>
            <h2>Every generation adds a page.</h2>
            <p>Have a story, a photograph, or a memory to share? We’d love to keep it safe here.</p>
            <button className="button button-dark" onClick={() => announce("Ask your family administrator for an invitation.")}>Join the family space <ArrowRight size={16} /></button>
          </section>

          <footer className="site-footer">
            <div className="page-shell footer-inner">
              <button className="brand-lockup footer-brand" onClick={() => goTo("home")}>
                <span className="brand-mark"><TreePine size={21} strokeWidth={1.6} /></span>
                <span className="brand-name">the wood family<span>EST. 1905</span></span>
              </button>
              <p>Made with love, for all of us.</p>
              <div className="footer-links">
                <button onClick={() => goTo("history")}>Our story</button><button onClick={() => goTo("stories")}>Stories</button><button onClick={() => announce(familyAccessNotice)}>Family sign in</button>
              </div>
              <span className="copyright">© {new Date().getFullYear()} THE WOOD FAMILY</span>
            </div>
          </footer>
        </>
      )}
      {notice && <div className="toast" role="status"><Sparkles size={16} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X size={15} /></button></div>}
    </main>
  );
}

function Dashboard({ activeSide, setActiveSide, onBack, onNotice }) {
  const [period, setPeriod] = useState("Last 7 days");
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const today = new Date();
  const dashboardDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(today).toUpperCase();
  const birthdayDate = new Date(today);
  birthdayDate.setDate(today.getDate() + 8);
  const lunchDate = new Date(today);
  lunchDate.setDate(today.getDate() + 17);
  const formatEventDate = (date) => ({
    day: String(date.getDate()).padStart(2, "0"),
    month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date).toUpperCase(),
  });
  const birthdayDateLabel = formatEventDate(birthdayDate);
  const lunchDateLabel = formatEventDate(lunchDate);
  const metrics = [
    { label: "Families", value: "02", change: "+1 this month", icon: Network, color: "lavender" },
    { label: "Family members", value: "14", change: "+3 this month", icon: Users, color: "mint" },
    { label: "Stories shared", value: "28", change: "+6 this month", icon: BookOpen, color: "peach" },
    { label: "Photos saved", value: "146", change: "+18 this month", icon: Image, color: "rose" },
  ];

  return (
    <div className="dashboard-app">
      <aside className={mobileSidebar ? "admin-sidebar open" : "admin-sidebar"}>
        <button className="admin-brand" onClick={onBack} aria-label="Go to family website"><span><TreePine size={22} /></span></button>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="admin-nav" aria-label="Dashboard navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={activeSide === label ? "admin-nav-item selected" : "admin-nav-item"}
              onClick={() => {
                setActiveSide(label);
                setMobileSidebar(false);
                if (label !== "Overview") onNotice(`${label} management selected. Your family data is up to date.`);
              }}
            ><Icon size={18} /><span>{label}</span>{label === "Members" && <span className="nav-count">14</span>}</button>
          ))}
        </nav>
        <div className="sidebar-label sidebar-label-lower">PREFERENCES</div>
        <nav className="admin-nav">
          <button className="admin-nav-item" onClick={() => onNotice("Privacy settings are managed by your family administrator.")}><Shield size={18} /><span>Privacy settings</span></button>
          <button className="admin-nav-item" onClick={() => onNotice("Settings are coming soon.")}><Settings size={18} /><span>Settings</span></button>
        </nav>
        <div className="sidebar-spacer" />
        <button className="sidebar-help" onClick={() => onNotice("Need a hand? Contact your family administrator.")}><CircleHelp size={17} /><span>Help & support</span></button>
        <button className="admin-profile" onClick={() => onNotice("Signed in as Khalid Wood · Super Admin.")}>
          <span className="profile-avatar">KW</span><span className="profile-details"><strong>Khalid Wood</strong><small>Super Admin</small></span><MoreHorizontal size={17} />
        </button>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <button className="dash-mobile-menu" onClick={() => setMobileSidebar((open) => !open)} aria-label="Toggle dashboard menu"><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{activeSide}</strong></div>
          <div className="topbar-actions">
            <button className="topbar-icon" onClick={() => setShowNotifications((show) => !show)} aria-label="Notifications"><Bell size={18} /><i /></button>
            <button className="visit-site-button" onClick={onBack}><Compass size={15} /> Visit family site <ArrowUpRight size={14} /></button>
            {showNotifications && <div className="notification-popover"><strong>You’re all caught up</strong><span>New family updates will show up here.</span></div>}
          </div>
        </header>

        <section className="dashboard-content">
          <div className="dash-welcome">
            <div>
              <span className="eyebrow">{dashboardDate}</span>
              <h1>Good morning, Khalid <span>✳</span></h1>
              <p>Here’s what’s happening with your family today.</p>
            </div>
            <button className="button button-dark add-story-button" onClick={() => onNotice("Story editor opened. Start a new family story.")}><Plus size={17} /> Add a story</button>
          </div>

          <div className="welcome-banner">
            <div className="welcome-banner-text"><span className="welcome-kicker">YOUR FAMILY, ALL IN ONE PLACE</span><h2>Every memory has<br />a home here.</h2><p>Keep your family close, wherever life takes you.</p><button onClick={() => onNotice("Your family directory is ready to explore.")}>Explore the directory <ArrowRight size={15} /></button></div>
            <div className="banner-art"><div className="banner-circle circle-one" /><div className="banner-circle circle-two" /><TreePine size={124} strokeWidth={0.75} /><span>growing<br />together</span></div>
            <Sparkles className="banner-sparkle sparkle-one" size={20} /><Sparkles className="banner-sparkle sparkle-two" size={14} />
          </div>

          <div className="metrics-grid">
            {metrics.map(({ label, value, change, icon: Icon, color }) => (
              <button className="metric-card" key={label} onClick={() => onNotice(`Opening ${label.toLowerCase()} overview.`)}>
                <span className={`metric-icon ${color}`}><Icon size={19} /></span>
                <span className="metric-label">{label}</span>
                <span className="metric-value">{value}</span>
                <span className="metric-change"><span>↗</span> {change}</span>
                <ArrowUpRight className="metric-arrow" size={16} />
              </button>
            ))}
          </div>

          <div className="dashboard-panels">
            <section className="dash-panel activity-panel">
              <div className="panel-heading"><div><h2>Family activity</h2><p>A little growth, day by day.</p></div><button className="period-button" onClick={() => setPeriod(period === "Last 7 days" ? "Last 30 days" : "Last 7 days")}>{period}<ChevronDown size={14} /></button></div>
              <ActivityChart label="Stories shared" color="#728a68" />
              <div className="chart-legend"><span><i className="legend-dot green-dot" />Stories shared</span><span className="chart-total">28 <small>total stories</small></span></div>
            </section>
            <section className="dash-panel activity-panel">
              <div className="panel-heading"><div><h2>Growing together</h2><p>New members in your family.</p></div><button className="panel-more" aria-label="More activity options" onClick={() => onNotice("Showing family growth details.")}><MoreHorizontal size={19} /></button></div>
              <ActivityChart label="New members" color="#c48367" />
              <div className="chart-legend"><span><i className="legend-dot peach-dot" />Family members</span><span className="chart-total">14 <small>in your family</small></span></div>
            </section>
          </div>

          <div className="dashboard-lower">
            <section className="dash-panel recent-panel">
              <div className="panel-heading"><div><h2>Recent stories</h2><p>Fresh from the family.</p></div><button className="small-text-link" onClick={() => setActiveSide("Stories")}>View all <ArrowRight size={14} /></button></div>
              {[stories[0], stories[1]].map((story, index) => (
                <button className="recent-story" key={story.title} onClick={() => onNotice(`Opening “${story.title}”.`)}>
                  <img src={story.image} alt="" /><span className="recent-story-copy"><strong>{story.title}</strong><small>{index === 0 ? "Eleanor Wood · 2 days ago" : "James Wood · 5 days ago"}</small></span><ArrowUpRight size={16} />
                </button>
              ))}
            </section>
            <section className="dash-panel calendar-panel">
              <div className="panel-heading"><div><h2>Coming up</h2><p>Good things to look forward to.</p></div><button className="panel-more" aria-label="Calendar options" onClick={() => onNotice("Family calendar opened.")}><CalendarDays size={17} /></button></div>
              <div className="event-row"><span className="event-date"><strong>{birthdayDateLabel.day}</strong><small>{birthdayDateLabel.month}</small></span><span className="event-copy"><strong>Grandma Eleanor’s birthday</strong><small><Clock3 size={12} /> In 8 days · Family gathering</small></span><ChevronRight size={17} /></div>
              <div className="event-row"><span className="event-date muted-date"><strong>{lunchDateLabel.day}</strong><small>{lunchDateLabel.month}</small></span><span className="event-copy"><strong>Wood family Sunday lunch</strong><small><Clock3 size={12} /> In 17 days · The old house</small></span><ChevronRight size={17} /></div>
            </section>
          </div>
          <footer className="dashboard-footer"><span>Made with <Heart size={12} fill="currentColor" /> for the Wood family</span><button onClick={() => onNotice("Your privacy matters. Family content is only visible to approved members.")}>Privacy & security</button><span>© {new Date().getFullYear()} Family Hub</span></footer>
        </section>
      </div>
    </div>
  );
}

function ActivityChart({ label, color }) {
  const data = [1, 1, 2, 1, 3, 2, 4, 3, 5, 4, 7, 5, 8, 6, 9, 8, 11, 9, 13, 12, 17, 15, 20, 22, 27, 24, 31, 28];
  const chartDates = [6, 4, 2, 0].map((daysAgo) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
  });
  const width = 560;
  const height = 118;
  const points = data.map((value, index) => `${(index / (data.length - 1)) * width},${height - (value / 34) * height}`).join(" ");
  const area = `0,${height} ${points} ${width},${height}`;
  return (
    <div className="chart-wrap" role="img" aria-label={`${label} increased over the last ${label === "New members" ? "7 days" : "7 days"}`}>
      <div className="chart-y-labels"><span>12</span><span>8</span><span>4</span><span>0</span></div>
      <svg className="chart-svg" viewBox={`0 0 ${width} ${height + 8}`} preserveAspectRatio="none" aria-hidden="true">
        {[0, 1, 2, 3].map((line) => <line key={line} x1="0" x2={width} y1={line * (height / 3)} y2={line * (height / 3)} stroke="#e9e9e3" strokeDasharray="3 5" />)}
        <polygon points={area} fill={color} opacity=".10" />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <circle cx={width} cy={height - (data[data.length - 1] / 34) * height} r="4" fill={color} stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="chart-x-labels">{chartDates.map((date) => <span key={date}>{date}</span>)}</div>
    </div>
  );
}

export default App;

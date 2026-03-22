const DATA = {
  emails: [
    { id:1, from:'Sarah Reynolds', initials:'SR', avatarBg:'#e8f0fe', avatarColor:'#1a73e8', subject:'Q2 planning doc — can you review?', time:'9:14 am', unread:true },
    { id:2, from:'Tyler Kim', initials:'TK', avatarBg:'#e1f5ee', avatarColor:'#0f6e56', subject:'Re: Weekend project update', time:'8:02 am', unread:true },
    { id:3, from:'Newsletter digest', initials:'NL', avatarBg:'#faeeda', avatarColor:'#854f0b', subject:'Your weekly reads are ready', time:'7:30 am', unread:false },
    { id:4, from:'Alex Martinez', initials:'AM', avatarBg:'#eeedfe', avatarColor:'#534ab7', subject:'Lunch tomorrow still on?', time:'Yesterday', unread:true },
    { id:5, from:'GitHub', initials:'GH', avatarBg:'#f2f1ee', avatarColor:'#5a5a5a', subject:'Your pull request was merged', time:'Yesterday', unread:false },
    { id:6, from:'Notion', initials:'NT', avatarBg:'#f2f1ee', avatarColor:'#5a5a5a', subject:'Page shared with you: Goals 2026', time:'Mon', unread:false },
  ],
  events: [
    { id:1, name:'Morning review', time:'9:00 am', detail:'Personal · 30 min', color:'#6359e9', day:'Today' },
    { id:2, name:'Deep work block', time:'11:00 am', detail:'Focus time · 2 hrs', color:'#1d9e75', day:'Today' },
    { id:3, name:'Call with Alex', time:'2:30 pm', detail:'Google Meet · 45 min', color:'#d85a30', day:'Today' },
    { id:4, name:'Gym', time:'6:00 pm', detail:'Personal · 1 hr', color:'#ba7517', day:'Today' },
    { id:5, name:'Team standup', time:'10:00 am', detail:'Video call · 30 min', color:'#6359e9', day:'Tomorrow' },
    { id:6, name:'Dentist appointment', time:'3:00 pm', detail:'Personal · 1 hr', color:'#d85a30', day:'Wednesday' },
  ],
  tasks: [
    { id:1, text:'Review Q2 planning document from Sarah', tag:'today', done:false },
    { id:2, text:'Finish homepage redesign draft', tag:'today', done:false },
    { id:3, text:'Update reading list doc in Drive', tag:'week', done:false },
    { id:4, text:'Send weekly recap notes', tag:'done', done:true },
    { id:5, text:'Research new productivity tools', tag:'someday', done:false },
    { id:6, text:'Reply to Alex about lunch', tag:'today', done:false },
  ],
  files: [
    { name:'Q2 Planning — 2026.gdoc', meta:'Modified 2 hrs ago · Shared', icon:'D', iconBg:'#e8f0fe', iconColor:'#1a73e8' },
    { name:'Budget tracker.gsheet', meta:'Modified yesterday', icon:'S', iconBg:'#e1f5ee', iconColor:'#0f6e56' },
    { name:'2026 Goals deck.gslides', meta:'Modified 3 days ago', icon:'P', iconBg:'#faeeda', iconColor:'#854f0b' },
    { name:'Reading list.gdoc', meta:'Modified last week', icon:'D', iconBg:'#eeedfe', iconColor:'#534ab7' },
    { name:'Personal finance notes.gdoc', meta:'Modified 2 weeks ago', icon:'D', iconBg:'#e8f0fe', iconColor:'#1a73e8' },
  ],
  projects: [
    {
      id: 1,
      name: 'Command Central',
      description: 'Personal productivity hub — Gmail, Calendar, Drive, Tasks & AI assistant in one place.',
      status: 'active',
      updated: 'Today',
      links: [
        { label: 'Live app', url: 'https://your-app.netlify.app', type: 'deploy' },
        { label: 'Claude chat', url: 'https://claude.ai', type: 'claude' }
      ],
      color: '#6359e9',
      initials: 'CC'
    },
    {
      id: 2,
      name: 'Open Claw',
      description: 'In progress — add your notes and links here once the project is underway.',
      status: 'in-progress',
      updated: 'Starting soon',
      links: [
        { label: 'Claude chat', url: 'https://claude.ai', type: 'claude' }
      ],
      color: '#1d9e75',
      initials: 'OC'
    }
  ]
};

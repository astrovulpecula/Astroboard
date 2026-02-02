export type Language = 'es' | 'en';

export const translations = {
  es: {
    // General
    settings: "Configuración",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    add: "Añadir",
    create: "Crear",
    search: "Buscar",
    upload: "Subir",
    download: "Descargar",
    export: "Exportar",
    import: "Importar",
    close: "Cerrar",
    confirm: "Confirmar",
    yes: "Sí",
    no: "No",
    loading: "Cargando...",
    drop: "Soltar",
    
    // Settings
    settingsTitle: "Configuración",
    userName: "Nombre de usuario",
    yourName: "Tu nombre",
    language: "Idioma",
    languageDescription: "Elige el idioma de la interfaz",
    spanish: "Español",
    english: "English",
    dateFormat: "Formato de fechas",
    dateFormatDescription: "Elige cómo se mostrarán las fechas en toda la aplicación",
    defaultTheme: "Tema de página by default",
    themeLight: "Claro",
    themeDark: "Oscuro",
    themeAstro: "Astro",
    jsonLocation: "Localización del archivo JSON",
    selectJsonFile: "Selecciona un archivo JSON",
    browse: "Buscar",
    jsonLocationDescription: "Selecciona el archivo JSON con tus datos. La aplicación lo cargará automáticamente al iniciar.",
    
    // Equipment
    astrophotographyEquipment: "Equipo astrofotográfico",
    cameras: "Cámaras",
    cameraName: "Nombre de cámara",
    addCamera: "Añadir cámara",
    telescopes: "Telescopios",
    telescopeName: "Nombre del telescopio",
    focalLength: "Focal (mm)",
    addTelescope: "Añadir telescopio",
    guideTelescope: "Telescopio guía",
    guideCamera: "Cámara guía",
    mount: "Montura",
    
    // Locations
    mainLocation: "Localización principal",
    locationName: "Nombre",
    coordinates: "Coordenadas",
    otherLocations: "Otras localizaciones",
    addLocation: "Añadir localización",
    
    // Visible Highlights
    visibleHighlights: "Destacados visibles",
    visibleHighlightsInDashboard: "Highlights visibles en el dashboard",
    showActiveObjects: "Mostrar objetos activos",
    showCompletedObjects: "Mostrar objetos completados",
    showTotalExposure: "Mostrar exposición total",
    showNextEvents: "Mostrar próximos eventos",
    highlightTotalObjects: "Total de Objetos",
    highlightTotalProjects: "Total de Proyectos",
    highlightTotalHours: "Horas Totales",
    highlightTotalLights: "Lights Totales",
    highlightNights: "Noches",
    highlightSessions: "Sesiones",
    highlightOnpSnp: "ONP vs SNP",
    highlightActiveProjects: "Proyectos Activos",
    highlightRatedPhotos: "Fotos Valoradas",
    highlightSnrRecord: "SNR (record)",
    highlightHoursByYear: "Horas por Año",
    highlightMostPhotographedObject: "Objeto Más Fotografiado",
    highlightMostPhotographedConstellation: "Constelación Más Fotografiada",
    highlightStreaks: "Rachas Consecutivas",
    highlightCameraUsage: "Uso de Cámaras",
    highlightTelescopeUsage: "Uso de Telescopios",
    
    // Objects
    objects: "Objetos",
    newObject: "Nuevo objeto",
    objectId: "ID del objeto",
    objectIdPlaceholder: "Ej: M31, NGC 7000",
    commonName: "Nombre común",
    commonNamePlaceholder: "Ej: Galaxia de Andrómeda",
    constellation: "Constelación",
    selectConstellation: "Seleccionar constelación",
    type: "Tipo",
    selectType: "Seleccionar tipo",
    searchObjects: "Buscar objetos...",
    noObjectsFound: "No se encontraron objetos",
    
    // Object Types
    typeGalaxy: "Galaxia",
    typeNebula: "Nebulosa",
    typeCluster: "Cúmulo",
    typePlanet: "Planeta",
    typeComet: "Cometa",
    typeStar: "Estrella",
    typeMoon: "Luna",
    typeOther: "Otro",
    
    // Projects
    projects: "Proyectos",
    newProject: "Nuevo Proyecto",
    projectName: "Nombre del proyecto",
    projectNamePlaceholder: "Ej: Campaña principal RGB",
    description: "Descripción",
    descriptionPlaceholder: "Breve descripción del proyecto",
    startDate: "Fecha de inicio",
    status: "Estado",
    statusActive: "Activo",
    statusPaused: "Pausado",
    statusCompleted: "Completado",
    location: "Localización",
    selectLocation: "Seleccionar localización",
    otherLocationOption: "Otra localización",
    noProjects: "No hay proyectos aún",
    createFirstProject: "Crea tu primer proyecto",
    
    // Sessions
    sessions: "Sesiones",
    newSession: "Nueva sesión",
    editSession: "Editar sesión",
    date: "Fecha",
    lights: "Lights",
    exposure: "Exposición",
    exposureSeconds: "Exposición (s)",
    filter: "Filtro",
    notes: "Notas",
    notesPlaceholder: "Notas opcionales...",
    moonPhase: "Fase lunar",
    snr: "SNR",
    noSessions: "No hay sesiones registradas",
    addFirstSession: "Añade tu primera sesión de captura",
    
    // FITS Analyzer
    fitsAnalyzer: "Analizador FITS",
    fitsDropzone: "Arrastra archivos FITS aquí o",
    fitsSelectFiles: "Seleccionar archivos",
    fitsSelectFolder: "Seleccionar carpeta",
    fitsProcessing: "Procesando archivos...",
    fitsNoFiles: "No se encontraron archivos FITS",
    fitsNoMetadata: "No se pudieron extraer metadatos de los archivos",
    fitsFilesAnalyzed: "archivos analizados",
    fitsRemoveAnalysis: "Eliminar análisis",
    fitsMpsas: "MPSAS",
    fitsClouds: "Nubes",
    fitsAmbientTemp: "Temp. ambiente",
    fitsSkyTemp: "Temp. cielo",
    fitsHumidity: "Humedad",
    fitsDewPoint: "Punto rocío",
    fitsPressure: "Presión",
    fitsWind: "Viento",
    fitsWindGust: "Racha",
    fitsTempChart: "Temperatura durante sesión",
    fitsSkyQualityChart: "Calidad del cielo (MPSAS)",
    fitsHumidityWindChart: "Humedad y viento",

    // Statistics
    statistics: "Métricas",
    totalExposure: "Exposición Total",
    totalLights: "Total Lights",
    totalSessions: "Total Sesiones",
    averageSNR: "SNR Promedio",
    hours: "horas",
    
    // Charts
    snrPerSession: "SNR Medio por Sesión",
    cumulativeExposure: "Exposición Acumulada",
    lightsPerSession: "Lights por Sesión",
    filterDistribution: "Distribución por Filtro",
    
    // Images
    images: "Imágenes",
    uploadImage: "Subir imagen",
    deleteImage: "Eliminar imagen",
    noImages: "No hay imágenes",
    
    // Ratings
    ratings: "Valoraciones",
    
    // Report
    generateReport: "Generar Reporte",
    projectReport: "Reporte del Proyecto",
    selectSections: "Seleccionar secciones",
    sessionDetails: "Detalles de sesiones",
    includeCharts: "Incluir gráficos",
    includeImages: "Incluir imágenes",
    generating: "Generando...",
    
    // Dashboard
    dashboard: "Dashboard",
    welcome: "Bienvenido",
    activeObjects: "Objetos activos",
    completedObjects: "Objetos completados",
    totalExposureTime: "Exposición total",
    upcomingEvents: "Próximos eventos",
    recentActivity: "Actividad reciente",
    quickActions: "Acciones rápidas",
    goodMorning: "Buenos días",
    goodAfternoon: "Buenas tardes",
    goodEvening: "Buenas noches",
    astronomer: "Astrónomo",
    todayMoonPhase: "Hoy la luna estará en fase",
    illuminated: "iluminada",
    risesAt: "Sale a las",
    setsAt: "Se pone a las",
    totalDarkness: "de oscuridad total",
    nextEphemeris: "Próxima efeméride",
    lunarPhases: "Fases lunares",
    visibleObjectsIn: "Objetos visibles en",
    noPlannedObjectsVisible: "No hay objetos planificados visibles en",
    astronomicalObjects: "Objetos astronómicos",
    
    // Main sections
    forecast: "Pronóstico",
    planning: "Planificación",
    objectsSection: "Objetos",
    statisticsSection: "Métricas",
    gallery: "Galería",
    weatherForecast: "Pronóstico Meteorológico",
    
    // Calendar
    calendar: "Calendario",
    today: "Hoy",
    month: "Mes",
    year: "Año",
    
    // Navigation
    back: "Volver",
    home: "Inicio",
    
    // Tabs
    tabs: "Pestañas",
    newTab: "Nueva pestaña",
    tabName: "Nombre de pestaña",
    renameTab: "Renombrar pestaña",
    deleteTab: "Eliminar pestaña",
    
    // Panels
    panels: "Paneles",
    panel: "Panel",
    editPanels: "Editar paneles",
    numberOfPanels: "Número de paneles",
    
    // Errors & Messages
    invalidJson: "JSON no válido: el archivo no contiene JSON válido",
    validationError: "Error de validación",
    storageWarning: "Aviso de almacenamiento",
    storageError: "Error de almacenamiento",
    couldNotSaveSettings: "No se pudieron guardar los ajustes.",
    savedSuccessfully: "Guardado correctamente",
    
    // Confirmations
    confirmDelete: "¿Estás seguro de que deseas eliminar?",
    confirmDeleteSession: "¿Eliminar esta sesión?",
    confirmDeleteProject: "¿Eliminar este proyecto?",
    confirmDeleteObject: "¿Eliminar este objeto?",
    
    // File Operations
    exportData: "Exportar datos",
    importData: "Importar datos",
    exportToJson: "Exportar a JSON",
    importFromJson: "Importar desde JSON",
    
    // Time
    secondsAbbr: "s",
    minutesAbbr: "min",
    hoursAbbr: "h",
    
    // Empty States
    noData: "Sin datos",
    getStarted: "¡Comienza añadiendo tu primer objeto!",
    
    // Tooltips
    clickToView: "Haz clic para ver",
    dragToReorder: "Arrastra para reordenar",
    
    // Filters
    advancedFilters: "Filtros avanzados",
    hideFilters: "Ocultar filtros",
    filterByConstellation: "Filtrar por constelación",
    filterByType: "Filtrar por tipo",
    filterByStatus: "Filtrar por estado",
    allConstellations: "Todas las constelaciones",
    allTypes: "Todos los tipos",
    allStatuses: "Todos los estados",
    
    // Search
    searchPlaceholder: "Buscar por código, nombre, constelación o tipo...",
    searchByObjectNameOrDescription: "Buscar por objeto, nombre o descripción...",
    noResultsFound: "No se encontraron resultados",
    
    // Fases lunares button
    lunarPhasesButton: "Fases lunares",
    
    // Create first
    createFirstObject: "Crear primer objeto",
    createFirstPlanning: "Crear primera planificación",
    noPlannedProjectsYet: "No tienes proyectos planificados todavía",
    noMatchingProjects: "No se encontraron proyectos que coincidan con la búsqueda",
    
    // Exit dialog
    exitConfirmTitle: "¿Descargar datos antes de salir?",
    exitConfirmDescription: "Puedes descargar tu archivo JSON para guardar todos los cambios.",
    exitDownload: "Descargar",
    exitClose: "Cerrar sin descargar",
  },
  en: {
    // General
    settings: "Settings",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    create: "Create",
    search: "Search",
    upload: "Upload",
    download: "Download",
    export: "Export",
    import: "Import",
    close: "Close",
    confirm: "Confirm",
    yes: "Yes",
    no: "No",
    loading: "Loading...",
    drop: "Drop",
    
    // Settings
    settingsTitle: "Settings",
    userName: "Username",
    yourName: "Your name",
    language: "Language",
    languageDescription: "Choose the interface language",
    spanish: "Español",
    english: "English",
    dateFormat: "Date format",
    dateFormatDescription: "Choose how dates will be displayed throughout the application",
    defaultTheme: "Default page theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeAstro: "Astro",
    jsonLocation: "JSON file location",
    selectJsonFile: "Select a JSON file",
    browse: "Browse",
    jsonLocationDescription: "Select the JSON file with your data. The app will load it automatically on startup.",
    
    // Equipment
    astrophotographyEquipment: "Astrophotography equipment",
    cameras: "Cameras",
    cameraName: "Camera name",
    addCamera: "Add camera",
    telescopes: "Telescopes",
    telescopeName: "Telescope name",
    focalLength: "Focal (mm)",
    addTelescope: "Add telescope",
    guideTelescope: "Guide telescope",
    guideCamera: "Guide camera",
    mount: "Mount",
    
    // Locations
    mainLocation: "Main location",
    locationName: "Name",
    coordinates: "Coordinates",
    otherLocations: "Other locations",
    addLocation: "Add location",
    
    // Visible Highlights
    visibleHighlights: "Visible highlights",
    visibleHighlightsInDashboard: "Visible highlights in dashboard",
    showActiveObjects: "Show active objects",
    showCompletedObjects: "Show completed objects",
    showTotalExposure: "Show total exposure",
    showNextEvents: "Show upcoming events",
    highlightTotalObjects: "Total Objects",
    highlightTotalProjects: "Total Projects",
    highlightTotalHours: "Total Hours",
    highlightTotalLights: "Total Lights",
    highlightNights: "Nights",
    highlightSessions: "Sessions",
    highlightOnpSnp: "ONP vs SNP",
    highlightActiveProjects: "Active Projects",
    highlightRatedPhotos: "Rated Photos",
    highlightSnrRecord: "SNR (record)",
    highlightHoursByYear: "Hours by Year",
    highlightMostPhotographedObject: "Most Photographed Object",
    highlightMostPhotographedConstellation: "Most Photographed Constellation",
    highlightStreaks: "Consecutive Streaks",
    highlightCameraUsage: "Camera Usage",
    highlightTelescopeUsage: "Telescope Usage",
    
    // Objects
    objects: "Objects",
    newObject: "New object",
    objectId: "Object ID",
    objectIdPlaceholder: "E.g.: M31, NGC 7000",
    commonName: "Common name",
    commonNamePlaceholder: "E.g.: Andromeda Galaxy",
    constellation: "Constellation",
    selectConstellation: "Select constellation",
    type: "Type",
    selectType: "Select type",
    searchObjects: "Search objects...",
    noObjectsFound: "No objects found",
    
    // Object Types
    typeGalaxy: "Galaxy",
    typeNebula: "Nebula",
    typeCluster: "Cluster",
    typePlanet: "Planet",
    typeComet: "Comet",
    typeStar: "Star",
    typeMoon: "Moon",
    typeOther: "Other",
    
    // Projects
    projects: "Projects",
    newProject: "New Project",
    projectName: "Project name",
    projectNamePlaceholder: "E.g.: Main RGB campaign",
    description: "Description",
    descriptionPlaceholder: "Brief project description",
    startDate: "Start date",
    status: "Status",
    statusActive: "Active",
    statusPaused: "Paused",
    statusCompleted: "Completed",
    location: "Location",
    selectLocation: "Select location",
    otherLocationOption: "Other location",
    noProjects: "No projects yet",
    createFirstProject: "Create your first project",
    
    // Sessions
    sessions: "Sessions",
    newSession: "New session",
    editSession: "Edit session",
    date: "Date",
    lights: "Lights",
    exposure: "Exposure",
    exposureSeconds: "Exposure (s)",
    filter: "Filter",
    notes: "Notes",
    notesPlaceholder: "Optional notes...",
    moonPhase: "Moon phase",
    snr: "SNR",
    noSessions: "No sessions recorded",
    addFirstSession: "Add your first capture session",
    
    // FITS Analyzer
    fitsAnalyzer: "FITS Analyzer",
    fitsDropzone: "Drag FITS files here or",
    fitsSelectFiles: "Select files",
    fitsSelectFolder: "Select folder",
    fitsProcessing: "Processing files...",
    fitsNoFiles: "No FITS files found",
    fitsNoMetadata: "Could not extract metadata from files",
    fitsFilesAnalyzed: "files analyzed",
    fitsRemoveAnalysis: "Remove analysis",
    fitsMpsas: "MPSAS",
    fitsClouds: "Clouds",
    fitsAmbientTemp: "Ambient temp",
    fitsSkyTemp: "Sky temp",
    fitsHumidity: "Humidity",
    fitsDewPoint: "Dew point",
    fitsPressure: "Pressure",
    fitsWind: "Wind",
    fitsWindGust: "Gust",
    fitsTempChart: "Temperature during session",
    fitsSkyQualityChart: "Sky quality (MPSAS)",
    fitsHumidityWindChart: "Humidity and wind",
    
    // Statistics
    statistics: "Metrics",
    totalExposure: "Total Exposure",
    totalLights: "Total Lights",
    totalSessions: "Total Sessions",
    averageSNR: "Average SNR",
    hours: "hours",
    
    // Charts
    snrPerSession: "Average SNR per Session",
    cumulativeExposure: "Cumulative Exposure",
    lightsPerSession: "Lights per Session",
    filterDistribution: "Filter Distribution",
    
    // Images
    images: "Images",
    uploadImage: "Upload image",
    deleteImage: "Delete image",
    noImages: "No images",
    
    // Ratings
    ratings: "Ratings",
    
    // Report
    generateReport: "Generate Report",
    projectReport: "Project Report",
    selectSections: "Select sections",
    sessionDetails: "Session details",
    includeCharts: "Include charts",
    includeImages: "Include images",
    generating: "Generating...",
    
    // Dashboard
    dashboard: "Dashboard",
    welcome: "Welcome",
    activeObjects: "Active objects",
    completedObjects: "Completed objects",
    totalExposureTime: "Total exposure",
    upcomingEvents: "Upcoming events",
    recentActivity: "Recent activity",
    quickActions: "Quick actions",
    goodMorning: "Good morning",
    goodAfternoon: "Good afternoon",
    goodEvening: "Good evening",
    astronomer: "Astronomer",
    todayMoonPhase: "Today the moon will be in",
    illuminated: "illuminated",
    risesAt: "Rises at",
    setsAt: "Sets at",
    totalDarkness: "of total darkness",
    nextEphemeris: "Next ephemeris",
    lunarPhases: "Lunar phases",
    visibleObjectsIn: "Visible objects in",
    noPlannedObjectsVisible: "No planned objects visible in",
    astronomicalObjects: "Astronomical objects",
    
    // Main sections
    forecast: "Forecast",
    planning: "Planning",
    objectsSection: "Objects",
    statisticsSection: "Metrics",
    gallery: "Gallery",
    weatherForecast: "Weather Forecast",
    
    // Calendar
    calendar: "Calendar",
    today: "Today",
    month: "Month",
    year: "Year",
    
    // Navigation
    back: "Back",
    home: "Home",
    
    // Tabs
    tabs: "Tabs",
    newTab: "New tab",
    tabName: "Tab name",
    renameTab: "Rename tab",
    deleteTab: "Delete tab",
    
    // Panels
    panels: "Panels",
    panel: "Panel",
    editPanels: "Edit panels",
    numberOfPanels: "Number of panels",
    
    // Errors & Messages
    invalidJson: "Invalid JSON: the file does not contain valid JSON",
    validationError: "Validation error",
    storageWarning: "Storage warning",
    storageError: "Storage error",
    couldNotSaveSettings: "Could not save settings.",
    savedSuccessfully: "Saved successfully",
    
    // Confirmations
    confirmDelete: "Are you sure you want to delete?",
    confirmDeleteSession: "Delete this session?",
    confirmDeleteProject: "Delete this project?",
    confirmDeleteObject: "Delete this object?",
    
    // File Operations
    exportData: "Export data",
    importData: "Import data",
    exportToJson: "Export to JSON",
    importFromJson: "Import from JSON",
    
    // Time
    secondsAbbr: "s",
    minutesAbbr: "min",
    hoursAbbr: "h",
    
    // Empty States
    noData: "No data",
    getStarted: "Get started by adding your first object!",
    
    // Tooltips
    clickToView: "Click to view",
    dragToReorder: "Drag to reorder",
    
    // Filters
    advancedFilters: "Advanced filters",
    hideFilters: "Hide filters",
    filterByConstellation: "Filter by constellation",
    filterByType: "Filter by type",
    filterByStatus: "Filter by status",
    allConstellations: "All constellations",
    allTypes: "All types",
    allStatuses: "All statuses",
    
    // Search
    searchPlaceholder: "Search by code, name, constellation or type...",
    searchByObjectNameOrDescription: "Search by object, name or description...",
    noResultsFound: "No results found",
    
    // Fases lunares button
    lunarPhasesButton: "Lunar phases",
    
    // Create first
    createFirstObject: "Create first object",
    createFirstPlanning: "Create first planning",
    noPlannedProjectsYet: "You don't have any planned projects yet",
    noMatchingProjects: "No projects matching the search were found",
    
    // Exit dialog
    exitConfirmTitle: "Download data before leaving?",
    exitConfirmDescription: "You can download your JSON file to save all changes.",
    exitDownload: "Download",
    exitClose: "Close without downloading",
  }
} as const;

export type TranslationKey = keyof typeof translations.es;

export const getTranslation = (lang: Language, key: TranslationKey): string => {
  return translations[lang][key] || translations.es[key] || key;
};

/src
├── assets/          # Static resources directory, storing static files like images and fonts
│
├── components/      # Components directory
│   ├── ui/         # shadcn/ui components directory, storing all shadcn components
│   │               # Note: Do not modify the source code of components in this directory
│   ├── auth/       # Authentication-related components
│   │   └── AuthGuard.tsx   # Component to protect routes requiring authentication
│   │
│   ├── layouts/    # Layout components
│   │   └── MainLayout.tsx  # Main layout wrapper for authenticated pages
│   │
│   ├── dashboard/  # Dashboard-related components
│   │   ├── StatCard.tsx           # Card for displaying key metrics
│   │   ├── UpcomingRenewals.tsx   # Component showing upcoming renewals
│   │   └── CategoryBreakdown.tsx  # Component showing spending by category
│   │
│   ├── subscription/ # Subscription-related components
│   │   ├── SubscriptionCard.tsx   # Card view of a subscription
│   │   └── SubscriptionForm.tsx   # Form for adding/editing subscriptions
│   │
│   ├── sync/       # Synchronization-related components
│   │   └── SyncStatus.tsx        # Component to display and manage synchronization status
│   │
│   ├── mode-toggle.tsx # Theme toggle button component for switching between light and dark modes
│   └── theme-provider.tsx # Theme provider wrapper using next-themes to enable theme functionality
│
├── hooks/          # Custom Hooks directory
│   ├── use-mobile.ts # Pre-installed mobile detection Hook from shadcn (import { useIsMobile } from '@/hooks/use-mobile')
│   └── use-toast.ts  # Toast notification system hook for displaying toast messages (import { useToast } from '@/hooks/use-toast')
│
├── lib/            # Utility library directory
│   ├── utils.ts    # Utility functions, including the cn function for merging Tailwind class names
│   ├── supabase.ts # Supabase client initialization and configuration
│   ├── subscription-utils.ts # Subscription-specific utility functions (formatting, calculations)
│   ├── sync/       # Synchronization-related utilities
│   │   ├── subscription-sync.ts # Main synchronization logic for subscription data
│   │   └── README.md # Documentation on how to set up and use synchronization
│   │
│   └── sql/        # SQL scripts for database setup
│       └── subscription-tables.sql # SQL script to create required tables in Supabase
│
├── store/          # State management directory
│   ├── authStore.ts       # Zustand store for authentication management
│   ├── settingsStore.ts   # Zustand store for settings management
│   └── subscriptionStore.ts # Zustand store for subscription management
│
├── types/          # TypeScript types directory
│   └── supabase.ts # Supabase database types
│
├── pages/          # Page components directory, based on React Router structure
│   ├── HomePage.tsx        # Home page component with dashboard and subscription management
│   ├── SettingsPage.tsx    # Settings page for user preferences
│   ├── ProfilePage.tsx     # User profile management page
│   ├── LoginPage.tsx       # Authentication login page
│   ├── SignupPage.tsx      # User registration page
│   ├── ForgotPasswordPage.tsx # Password recovery request page
│   └── ResetPasswordPage.tsx  # Password reset page
│
├── App.tsx         # Root component, with React Router routing system configured
│                   # Add new route configurations in this file
│
├── main.tsx        # Entry file, rendering the root component and mounting to the DOM
│
├── index.css       # Global styles file, containing Tailwind configuration and custom styles
│                   # Modify theme colors and design system variables in this file 
│
├── tailwind.config.js  # Tailwind CSS v3 configuration file
│                      # Contains theme customization, plugins, and content paths
│                      # Includes shadcn/ui theme configuration
│
├── postcss.config.js  # PostCSS configuration file
│                      # Configures Tailwind CSS and Autoprefixer plugins
│
└── components.json    # shadcn/ui components configuration file
                      # Defines component paths and styling options
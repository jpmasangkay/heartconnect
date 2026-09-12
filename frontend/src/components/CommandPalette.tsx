import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  LayoutDashboard,
  MessageSquare,
  Bell,
  User,
  PlusCircle,
  Bookmark,
  Shield,
  LogOut,
  Search,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from './ui/command';
import { useUiStore } from '../stores/useUiStore';
import { useAuth } from '../context/AuthContext';

export function CommandPalette() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const {
    isCommandPaletteOpen,
    closeCommandPalette,
    toggleCommandPalette,
  } = useUiStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleCommandPalette();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [toggleCommandPalette]);

  const handleSelect = (callback: () => void) => {
    closeCommandPalette();
    callback();
  };

  return (
    <CommandDialog open={isCommandPaletteOpen} onOpenChange={(open) => !open && closeCommandPalette()}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => handleSelect(() => navigate('/jobs'))}>
            <Briefcase className="w-4 h-4 text-stone-muted" />
            <span>Browse Job Board</span>
          </CommandItem>

          {isAuthenticated && (
            <>
              <CommandItem onSelect={() => handleSelect(() => navigate('/dashboard'))}>
                <LayoutDashboard className="w-4 h-4 text-stone-muted" />
                <span>My Dashboard</span>
              </CommandItem>

              <CommandItem onSelect={() => handleSelect(() => navigate('/chat'))}>
                <MessageSquare className="w-4 h-4 text-stone-muted" />
                <span>Messages & Chat</span>
              </CommandItem>

              <CommandItem onSelect={() => handleSelect(() => navigate('/notifications'))}>
                <Bell className="w-4 h-4 text-stone-muted" />
                <span>Notifications</span>
              </CommandItem>

              <CommandItem onSelect={() => handleSelect(() => navigate('/saved-jobs'))}>
                <Bookmark className="w-4 h-4 text-stone-muted" />
                <span>Saved Jobs</span>
              </CommandItem>

              <CommandItem onSelect={() => handleSelect(() => navigate('/profile'))}>
                <User className="w-4 h-4 text-stone-muted" />
                <span>Account Profile</span>
              </CommandItem>
            </>
          )}

          {user?.role === 'admin' && (
            <CommandItem onSelect={() => handleSelect(() => navigate('/admin'))}>
              <Shield className="w-4 h-4 text-amber-600" />
              <span>Admin Management Center</span>
            </CommandItem>
          )}
        </CommandGroup>

        {/* Quick Actions */}
        <CommandSeparator />
        <CommandGroup heading="Actions">
          {user?.role === 'client' && (
            <CommandItem onSelect={() => handleSelect(() => navigate('/post-job'))}>
              <PlusCircle className="w-4 h-4 text-navy" />
              <span>Create New Job Posting</span>
            </CommandItem>
          )}

          <CommandItem onSelect={() => handleSelect(() => navigate('/jobs?skill=Web Development'))}>
            <Search className="w-4 h-4 text-stone-muted" />
            <span>Filter by Web Development</span>
          </CommandItem>

          <CommandItem onSelect={() => handleSelect(() => navigate('/jobs?skill=Graphic Design'))}>
            <Search className="w-4 h-4 text-stone-muted" />
            <span>Filter by Graphic Design</span>
          </CommandItem>

          {isAuthenticated && (
            <CommandItem
              onSelect={() =>
                handleSelect(async () => {
                  await logout();
                  navigate('/login');
                })
              }
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span className="text-red-600">Sign Out</span>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

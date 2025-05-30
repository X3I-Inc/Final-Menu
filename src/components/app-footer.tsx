export default function AppFooter() {
  return (
    <footer className="bg-secondary text-secondary-foreground border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col items-center justify-center gap-2 md:h-20 md:flex-row md:justify-between">
        <p className="text-sm text-center md:text-left">
          &copy; {new Date().getFullYear()} MenuLink. Crafted with care.
        </p>
        {/* You can add more links or information here if needed */}
      </div>
    </footer>
  );
}

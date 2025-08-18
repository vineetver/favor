export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="mt-8 flex items-center justify-center border-t border-border pb-8">
      <p className="mx-5 mt-8 text-sm leading-5 text-muted-foreground md:order-1">
        &copy; {currentYear} Harvard T.H Chan School of Public Health, Inc. All
        rights reserved.
      </p>
    </div>
  );
}

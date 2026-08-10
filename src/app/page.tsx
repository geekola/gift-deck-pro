const GOLD = "#B98128";

const sections: { label: string; links: { href: string; label: string }[] }[] = [
  {
    label: "Platform Admin",
    links: [
      { href: "/platform-admin", label: "Dashboard shell" },
      { href: "/platform-admin/review-queue", label: "Brand application review queue" },
    ],
  },
  {
    label: "Brand Admin Portal",
    links: [
      { href: "/brand/login", label: "Registration / login" },
      { href: "/brand/settings", label: "Company settings" },
      { href: "/brand/products", label: "Product catalogue" },
      { href: "/brand/products/new", label: "Product add / edit form" },
      { href: "/brand/customers", label: "Customer access manager" },
      { href: "/brand/vip-talent", label: "VIP talent contracts" },
      { href: "/brand/bulk-upload", label: "Bulk upload" },
      { href: "/brand/notifications", label: "Document notifications" },
    ],
  },
  {
    label: "Customer-Facing App",
    links: [
      { href: "/customer/sign-in", label: "Sign in" },
      { href: "/customer/categories", label: "Category selector" },
      { href: "/customer/deck", label: "Swipe deck" },
      { href: "/customer/gallery", label: "Saved gallery" },
      { href: "/customer/review", label: "Review & submit" },
      { href: "/customer/orders", label: "Order status" },
      { href: "/customer/settings", label: "Settings" },
      { href: "/customer/measurements", label: "Measurement profile setup" },
    ],
  },
];

export default function Home() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Gift Deck Pro</h1>
      <p style={{ color: "#AFAFAF", marginBottom: 40 }}>
        Preview build — every screen below is still local mock data, not wired to a backend.
      </p>
      {sections.map((section) => (
        <div key={section.label} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, letterSpacing: 1, textTransform: "uppercase", color: GOLD, marginBottom: 12 }}>
            {section.label}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {section.links.map((link) => (
              <li key={link.href} style={{ marginBottom: 8 }}>
                <a
                  href={link.href}
                  style={{ color: "#EAEAEA", textDecoration: "none", borderBottom: "1px solid #2A2A2A" }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </main>
  );
}

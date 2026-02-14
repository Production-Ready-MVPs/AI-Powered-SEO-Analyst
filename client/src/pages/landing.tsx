import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Search,
  Zap,
  BarChart3,
  Shield,
  ArrowRight,
  Globe,
  Code2,
  TrendingUp,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Search className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg" data-testid="text-logo">DevSEO AI</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-how-it-works">How it Works</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-pricing">Pricing</a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="/api/login">
              <Button variant="outline" data-testid="button-login">Log in</Button>
            </a>
            <a href="/api/login">
              <Button data-testid="button-get-started">Get Started</Button>
            </a>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="w-3 h-3" />
                AI-Powered SEO Analysis
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold leading-tight tracking-tight" data-testid="text-hero-title">
                Optimize your site with{" "}
                <span className="text-primary">AI-driven</span>{" "}
                SEO insights
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                Get comprehensive SEO audits powered by advanced AI. Discover issues,
                receive actionable recommendations, and watch your search rankings climb.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a href="/api/login">
                  <Button size="lg" className="gap-2" data-testid="button-hero-cta">
                    Start Free Audit <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
                <a href="#features">
                  <Button size="lg" variant="outline" data-testid="button-hero-learn">
                    Learn More
                  </Button>
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  10 free credits
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  AI-powered insights
                </span>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl blur-3xl" />
                <Card className="relative overflow-visible border-card-border">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-mono text-muted-foreground">example.com</span>
                      </div>
                      <Badge variant="secondary">Analyzing...</Badge>
                    </div>
                    <div className="space-y-3">
                      <ScoreBar label="Meta Tags" score={92} color="bg-emerald-500 dark:bg-emerald-400" />
                      <ScoreBar label="Content Quality" score={78} color="bg-amber-500 dark:bg-amber-400" />
                      <ScoreBar label="Performance" score={85} color="bg-blue-500 dark:bg-blue-400" />
                      <ScoreBar label="Technical SEO" score={64} color="bg-red-500 dark:bg-red-400" />
                    </div>
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground">Add meta description to improve click-through rates by 30%</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground">Optimize H1 tag structure for better keyword targeting</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif font-bold mb-4" data-testid="text-features-title">Everything you need for SEO success</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our AI analyzes your website across multiple dimensions to give you
              the most comprehensive SEO audit available.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Search className="w-5 h-5" />}
              title="Deep Site Crawling"
              description="Our engine crawls your entire site, analyzing every page for SEO opportunities and issues."
            />
            <FeatureCard
              icon={<Zap className="w-5 h-5" />}
              title="AI Recommendations"
              description="Get actionable, prioritized recommendations powered by advanced AI models."
            />
            <FeatureCard
              icon={<BarChart3 className="w-5 h-5" />}
              title="Detailed Scoring"
              description="Receive scores across meta tags, content quality, performance, and technical SEO."
            />
            <FeatureCard
              icon={<Code2 className="w-5 h-5" />}
              title="Technical Analysis"
              description="Check robots.txt, sitemaps, schema markup, and other technical SEO factors."
            />
            <FeatureCard
              icon={<TrendingUp className="w-5 h-5" />}
              title="Track Progress"
              description="Monitor your improvements over time with historical audit comparisons."
            />
            <FeatureCard
              icon={<Shield className="w-5 h-5" />}
              title="Security & Privacy"
              description="Your data is encrypted and never shared. We take security seriously."
            />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 px-6 bg-card/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-serif font-bold mb-4">How it works</h2>
          <p className="text-muted-foreground mb-12">Three simple steps to better SEO</p>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard step="1" title="Enter your URL" description="Simply paste any website URL and hit analyze." />
            <StepCard step="2" title="AI analyzes" description="Our AI crawls and evaluates your site across key SEO metrics." />
            <StepCard step="3" title="Get results" description="Receive a detailed report with scores and actionable recommendations." />
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-serif font-bold mb-4">Simple pricing</h2>
          <p className="text-muted-foreground mb-12">Start free, scale as you grow</p>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <PricingCard
              title="Free"
              price="$0"
              credits="10 credits"
              features={["10 free audits", "Basic AI analysis", "Score breakdown"]}
              cta="Get Started"
              variant="outline"
            />
            <PricingCard
              title="Pro"
              price="$19"
              credits="100 credits/mo"
              features={["100 audits/month", "Advanced AI insights", "Priority processing", "Export reports"]}
              cta="Upgrade to Pro"
              variant="default"
              highlighted
            />
            <PricingCard
              title="Team"
              price="$49"
              credits="500 credits/mo"
              features={["500 audits/month", "Team collaboration", "API access", "Custom branding"]}
              cta="Contact Sales"
              variant="outline"
            />
          </div>
        </div>
      </section>

      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Search className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">DevSEO AI</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} DevSEO AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-xs font-mono text-muted-foreground">{score}/100</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="hover-elevate">
      <CardContent className="p-6 space-y-3">
        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

function StepCard({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="space-y-3">
      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto">
        {step}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function PricingCard({
  title,
  price,
  credits,
  features,
  cta,
  variant,
  highlighted,
}: {
  title: string;
  price: string;
  credits: string;
  features: string[];
  cta: string;
  variant: "default" | "outline";
  highlighted?: boolean;
}) {
  return (
    <Card className={highlighted ? "border-primary ring-1 ring-primary" : ""}>
      <CardContent className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <div className="mt-2">
            <span className="text-3xl font-bold">{price}</span>
            {price !== "$0" && <span className="text-sm text-muted-foreground">/mo</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{credits}</p>
        </div>
        <ul className="space-y-2">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <a href="/api/login">
          <Button variant={variant} className="w-full" data-testid={`button-pricing-${title.toLowerCase()}`}>
            {cta}
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}

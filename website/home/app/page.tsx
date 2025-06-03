"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col space-y-24">
      {/* Hero Section */}
      <section className="pt-24 pb-32 bg-white">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-left space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold">
              Build Better Workflows
            </h1>
            <p className="text-lg text-gray-600">
              Streamline your AI agents and deploy with confidence.
            </p>
            <div>
              <Button asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>
          </div>
          <div className="flex-1">
            <Image
              src="/assets/home/trace.png"
              alt="Product screenshot"
              width={600}
              height={400}
              className="rounded-lg shadow-lg border"
            />
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-6 text-center space-y-6">
          <p className="text-sm font-semibold text-gray-500">
            Trusted by leading teams
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 grayscale">
            <Image src="/vercel.svg" alt="Vercel" width={100} height={40} />
            <Image src="/next.svg" alt="Next.js" width={80} height={40} />
            <Image src="/logo-dark.svg" alt="Logo" width={90} height={40} />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16">
        <div className="container mx-auto px-6 text-center space-y-12">
          <h2 className="text-3xl font-bold">Why teams love GenSX</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 border rounded-lg space-y-2">
              <h3 className="font-semibold">Fast setup</h3>
              <p className="text-gray-600">
                Go from idea to production in minutes.
              </p>
            </div>
            <div className="p-6 border rounded-lg space-y-2">
              <h3 className="font-semibold">Scalable workflows</h3>
              <p className="text-gray-600">
                Handle complex agents without breaking a sweat.
              </p>
            </div>
            <div className="p-6 border rounded-lg space-y-2">
              <h3 className="font-semibold">Built-in observability</h3>
              <p className="text-gray-600">
                Understand every step with real-time tracing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6 text-center space-y-12">
          <h2 className="text-3xl font-bold">Get started in three steps</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <h3 className="font-semibold">1. Sign up</h3>
              <p className="text-gray-600">
                Create your free account to begin.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">2. Build workflow</h3>
              <p className="text-gray-600">
                Use our visual builder or code directly.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">3. Deploy</h3>
              <p className="text-gray-600">
                Launch to the cloud with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16">
        <div className="container mx-auto px-6 text-center space-y-12">
          <h2 className="text-3xl font-bold">Pricing: Why it&#39;s worth it</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="border rounded-lg p-6 flex flex-col items-center space-y-4">
              <h3 className="text-xl font-semibold">Basic</h3>
              <p className="text-4xl font-bold">$19</p>
              <ul className="text-gray-600 space-y-1">
                <li>Starter workflows</li>
                <li>Email support</li>
              </ul>
              <Button className="mt-auto">Choose</Button>
            </div>
            <div className="border-2 border-primary rounded-lg p-6 flex flex-col items-center space-y-4 bg-[#ffe066]/10">
              <h3 className="text-xl font-semibold">Pro</h3>
              <p className="text-4xl font-bold">$49</p>
              <ul className="text-gray-600 space-y-1">
                <li>All Basic features</li>
                <li>Advanced analytics</li>
                <li>Priority support</li>
              </ul>
              <Button className="mt-auto">Choose</Button>
            </div>
            <div className="border rounded-lg p-6 flex flex-col items-center space-y-4">
              <h3 className="text-xl font-semibold">Enterprise</h3>
              <p className="text-4xl font-bold">Contact</p>
              <ul className="text-gray-600 space-y-1">
                <li>Custom workflows</li>
                <li>Dedicated support</li>
              </ul>
              <Button className="mt-auto">Contact Us</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6 text-center space-y-12">
          <h2 className="text-3xl font-bold">Loved by our users</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <blockquote className="p-6 border rounded-lg">
              <p className="text-gray-700">
                “GenSX transformed how we build AI workflows.”
              </p>
              <footer className="mt-2 text-sm text-gray-500">
                Alex, Product Lead
              </footer>
            </blockquote>
            <blockquote className="p-6 border rounded-lg">
              <p className="text-gray-700">
                “The observability tools are a game changer.”
              </p>
              <footer className="mt-2 text-sm text-gray-500">
                Jamie, Engineer
              </footer>
            </blockquote>
            <blockquote className="p-6 border rounded-lg">
              <p className="text-gray-700">
                “Amazing support and easy deployment.”
              </p>
              <footer className="mt-2 text-sm text-gray-500">
                Taylor, Founder
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="container mx-auto px-6 space-y-8">
          <h2 className="text-3xl font-bold text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            <details className="border rounded-lg p-4">
              <summary className="font-medium cursor-pointer">
                How do I start a free trial?
              </summary>
              <p className="mt-2 text-gray-600">
                Sign up and your 14-day trial begins immediately.
              </p>
            </details>
            <details className="border rounded-lg p-4">
              <summary className="font-medium cursor-pointer">
                Can I cancel anytime?
              </summary>
              <p className="mt-2 text-gray-600">
                Yes, cancel or change plans whenever you need.
              </p>
            </details>
            <details className="border rounded-lg p-4">
              <summary className="font-medium cursor-pointer">
                Do you offer support?
              </summary>
              <p className="mt-2 text-gray-600">
                Email and chat support are included in all plans.
              </p>
            </details>
            <details className="border rounded-lg p-4">
              <summary className="font-medium cursor-pointer">
                Is there an API?
              </summary>
              <p className="mt-2 text-gray-600">
                Yes, integrate via our secure REST API.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-primary text-center text-gray-900">
        <div className="container mx-auto px-6 space-y-6">
          <h2 className="text-4xl font-bold">Ready to build?</h2>
          <Button asChild variant="secondary">
            <Link href="/signup">Try Free</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

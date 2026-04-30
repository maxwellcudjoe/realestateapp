import { Button } from '@/components/ui/Button'

export function CtaBanner() {
  return (
    <section
      className="py-24 px-8 border-t border-b border-gold/10"
      style={{
        background: 'linear-gradient(135deg, #0f0b03 0%, #1a1200 50%, #0f0b03 100%)',
      }}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="font-serif text-4xl md:text-5xl font-light text-ivory mb-3">
            Ready to invest?
          </h2>
          <p className="font-sans text-sm font-light text-stone tracking-wide">
            Register your buyer criteria today and receive matched deals direct to your inbox.
          </p>
        </div>
        <Button href="/register" className="flex-shrink-0 text-xs px-10 py-4">
          Get Started
        </Button>
      </div>
    </section>
  )
}

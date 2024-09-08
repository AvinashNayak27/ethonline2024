import { ArrowRight, Activity, Trophy, Users } from 'lucide-react'

export default function LandingPage() {
    
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      <header className="container mx-auto px-6 py-8">
        <nav className="flex items-center justify-between">
          <div className="text-3xl font-bold text-indigo-600">Verifit</div>
          <div className="hidden md:flex space-x-6">
            <a href="#features" className="text-gray-600 hover:text-indigo-600 transition">Features</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-indigo-600 transition">How It Works</a>
            <a href="#testimonials" className="text-gray-600 hover:text-indigo-600 transition">Testimonials</a>
          </div>
          <a href="/login" className="bg-indigo-600 text-white px-6 py-2 rounded-full hover:bg-indigo-700 transition">
            Get Started
          </a>
        </nav>
      </header>

      <main>
        <section className="container mx-auto px-6 py-16 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-500">
            Achieve Your Fitness Goals with Accountability
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Verifit helps you stay on track with your fitness journey through social accountability and personalized challenges.
          </p>
          <a href="/signup" className="bg-indigo-600 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-indigo-700 transition inline-flex items-center">
            Start Your Journey <ArrowRight className="ml-2" />
          </a>
        </section>

        <section id="features" className="bg-white py-16">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose Verifit?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Activity className="w-12 h-12 text-indigo-600" />}
                title="Track Your Progress"
                description="Easily log your daily activities and see your improvement over time."
              />
              <FeatureCard 
                icon={<Trophy className="w-12 h-12 text-indigo-600" />}
                title="Set Personal Challenges"
                description="Create custom challenges to push yourself further and achieve new milestones."
              />
              <FeatureCard 
                icon={<Users className="w-12 h-12 text-indigo-600" />}
                title="Community Support"
                description="Connect with like-minded individuals and motivate each other to succeed."
              />
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-16 bg-gradient-to-br from-indigo-50 to-purple-50">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-12">How Verifit Works</h2>
            <div className="flex flex-col md:flex-row items-center justify-center space-y-8 md:space-y-0 md:space-x-12">
              <div className="w-full md:w-1/2">
                <img src="https://coral-heavy-louse-549.mypinata.cloud/ipfs/QmWa5v545dx8qBd8ep7H3RtPYLbBSsDZCCpnN3NWDBSfmv" alt="How Verifit Works" className="rounded-lg shadow-lg" />
              </div>
              <div className="w-full md:w-1/2 space-y-4">
                <Step number={1} title="Sign Up" description="Create your account and set your fitness goals." />
                <Step number={2} title="Connect" description="Sync your google fitness activity and attest daily." />
                <Step number={3} title="Challenge" description="Create or join challenges to push your limits." />
                <Step number={4} title="Verify" description="Attest your progress daily to stay accountable." />
                <Step number={5} title="Succeed" description="Achieve your goals and celebrate your success!" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg shadow-md hover:shadow-lg transition">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-center">{title}</h3>
      <p className="text-gray-600 text-center">{description}</p>
    </div>
  )
}

function Step({ number, title, description }) {
  return (
    <div className="flex items-start">
      <div className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">
        {number}
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  )
}

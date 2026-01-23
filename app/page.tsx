"use client"
import Image from "next/image";
import Link from "next/link";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";

export default function Home() {
  const { user } = useUser();

  return (
    <div>
      <header className="flex flex-wrap sm:justify-start sm:flex-nowrap z-50 w-full bg-white border-b border-gray-200 text-sm py-3 sm:py-0 dark:bg-neutral-800 dark:border-neutral-700">
        <nav className="relative p-4 max-w-[85rem] w-full mx-auto px-4 sm:flex sm:items-center sm:justify-between sm:px-6 lg:px-8" aria-label="Global">
          <div className="flex items-center justify-between">
            <div className="flex gap-2 items-center w-max">
              <Image src={'/logo2.png'} alt="logo" width={150} height={150} className="h-10 w-10" />
              <h2 className="font-medium text-2xl inline-block">Track Analytics</h2>
            </div>
          </div>
          <div id="navbar-collapse-with-animation" className="hs-collapse hidden overflow-hidden transition-all duration-300 basis-full grow sm:block">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end sm:ps-7 cursor-pointer">
              {!user ? (
                <SignInButton mode='modal' signUpForceRedirectUrl={'/dashboard'}>
                  <div className="flex items-center gap-x-2 font-medium text-gray-500 hover:text-blue-600 sm:border-s sm:border-gray-300 py-2 sm:py-0 sm:ms-4 sm:my-6 sm:ps-6 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-blue-500">
                    <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
                    </svg>
                    Get Started
                  </div>
                </SignInButton>
              ) : (
                <div className="flex items-center gap-4">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-x-2 font-medium text-gray-500 hover:text-blue-600 sm:border-s sm:border-gray-300 py-2 sm:py-0 sm:ms-4 sm:my-6 sm:ps-6 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-blue-500"
                  >
                    Go to Dashboard
                  </Link>
                  <UserButton />
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      <div className="relative overflow-hidden before:absolute before:top-0 before:start-1/2 before:bg-[url('https://preline.co/assets/svg/examples/polygon-bg-element.svg')] dark:before:bg-[url('https://preline.co/assets/svg/examples-dark/polygon-bg-element.svg')] before:bg-no-repeat before:bg-top before:bg-cover before:size-full before:-z-[1] before:transform before:-translate-x-1/2">
        <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-4 pt-24 pb-10">
          <div className="mt-5 max-w-2xl text-center mx-auto">
            <h1 className="block font-bold text-gray-800 text-4xl md:text-5xl lg:text-6xl dark:text-neutral-200">
              Powerful Analytics for
              <span className="bg-clip-text bg-gradient-to-tl from-blue-600 to-violet-600 text-transparent"> Your Websites</span>
            </h1>
          </div>

          <div className="mt-5 max-w-3xl text-center mx-auto">
            <p className="text-lg text-gray-600 dark:text-neutral-400">
              Track visitor behavior, understand user journeys, and make data-driven decisions. Real-time analytics that help you grow your business.
            </p>
          </div>

          <div className="mt-8 gap-3 flex justify-center">
            {!user ? (
              <SignInButton mode='modal' signUpForceRedirectUrl={'/dashboard'}>
                <button className="inline-flex justify-center items-center gap-x-3 text-center bg-gradient-to-tl from-blue-600 to-violet-600 hover:from-violet-600 hover:to-blue-600 border border-transparent cursor-pointer text-white text-sm font-medium rounded-md focus:outline-none focus:ring-1 focus:ring-gray-600 py-3 px-4 dark:focus:ring-offset-gray-800">
                  Get Started
                  <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </SignInButton>
            ) : (
              <Link
                href="/dashboard"
                className="inline-flex justify-center items-center gap-x-3 text-center bg-gradient-to-tl from-blue-600 to-violet-600 hover:from-violet-600 hover:to-blue-600 border border-transparent cursor-pointer text-white text-sm font-medium rounded-md focus:outline-none focus:ring-1 focus:ring-gray-600 py-3 px-4 dark:focus:ring-offset-gray-800"
              >
                Go to Dashboard
                <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
            Everything you need to understand your audience
          </h2>
          <p className="text-lg text-gray-600 dark:text-neutral-400">
            Comprehensive analytics features designed for modern websites
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 items-center gap-6">
          <div className="group flex flex-col justify-center hover:bg-gray-50 rounded-xl p-4 md:p-7 dark:hover:bg-neutral-800 transition-all">
            <div className="flex justify-center items-center size-12 bg-blue-600 rounded-xl">
              <svg className="flex-shrink-0 size-6 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div className="mt-5">
              <h3 className="group-hover:text-gray-600 text-lg font-semibold text-gray-800 dark:text-white dark:group-hover:text-gray-400">Real-Time Tracking</h3>
              <p className="mt-1 text-gray-600 dark:text-neutral-400">Monitor active visitors and page views as they happen in real-time</p>
            </div>
          </div>

          <div className="group flex flex-col justify-center hover:bg-gray-50 rounded-xl p-4 md:p-7 dark:hover:bg-neutral-800 transition-all">
            <div className="flex justify-center items-center size-12 bg-blue-600 rounded-xl">
              <svg className="flex-shrink-0 size-6 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="M18 7v10" />
                <path d="M13 7v10" />
                <path d="M8 7v10" />
              </svg>
            </div>
            <div className="mt-5">
              <h3 className="group-hover:text-gray-600 text-lg font-semibold text-gray-800 dark:text-white dark:group-hover:text-gray-400">Detailed Reports</h3>
              <p className="mt-1 text-gray-600 dark:text-neutral-400">Comprehensive analytics with visitor counts, sessions, and page views</p>
            </div>
          </div>

          <div className="group flex flex-col justify-center hover:bg-gray-50 rounded-xl p-4 md:p-7 dark:hover:bg-neutral-800 transition-all">
            <div className="flex justify-center items-center size-12 bg-blue-600 rounded-xl">
              <svg className="flex-shrink-0 size-6 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div className="mt-5">
              <h3 className="group-hover:text-gray-600 text-lg font-semibold text-gray-800 dark:text-white dark:group-hover:text-gray-400">Advanced Filters</h3>
              <p className="mt-1 text-gray-600 dark:text-neutral-400">Filter by device type, browser, country, and time ranges</p>
            </div>
          </div>

          <div className="group flex flex-col justify-center hover:bg-gray-50 rounded-xl p-4 md:p-7 dark:hover:bg-neutral-800 transition-all">
            <div className="flex justify-center items-center size-12 bg-blue-600 rounded-xl">
              <svg className="flex-shrink-0 size-6 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <div className="mt-5">
              <h3 className="group-hover:text-gray-600 text-lg font-semibold text-gray-800 dark:text-white dark:group-hover:text-gray-400">Time Series Data</h3>
              <p className="mt-1 text-gray-600 dark:text-neutral-400">Visualize trends with daily, weekly, and monthly analytics charts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 mx-auto bg-gray-50 dark:bg-neutral-900 rounded-2xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
            Simple setup, powerful insights
          </h2>
          <p className="text-lg text-gray-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Get started in minutes. Add our lightweight tracking script to your website and start collecting valuable analytics data immediately.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="flex justify-center items-center size-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">1</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Create Account</h3>
            <p className="text-gray-600 dark:text-neutral-400">Sign up for free and create your first website project</p>
          </div>

          <div className="text-center">
            <div className="flex justify-center items-center size-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">2</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Add Tracking Code</h3>
            <p className="text-gray-600 dark:text-neutral-400">Copy and paste our tracking script into your website</p>
          </div>

          <div className="text-center">
            <div className="flex justify-center items-center size-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">3</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">View Analytics</h3>
            <p className="text-gray-600 dark:text-neutral-400">Start tracking visitors and analyzing your website performance</p>
          </div>
        </div>
      </div>
    </div>
  );
}

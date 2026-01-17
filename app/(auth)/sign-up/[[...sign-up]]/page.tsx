import { SignUp } from '@clerk/nextjs'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import AuthRedirect from '../../auth-redirect'

export default async function Page() {
    const user = await currentUser()
    if (user) {
        redirect('/post-auth')
    }

    return (
        <div className='flex items-center justify-center min-h-screen'>
            <AuthRedirect destination="/post-auth" />
            <SignUp 
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                afterSignUpUrl="/post-auth"
                fallbackRedirectUrl="/post-auth"
            />
        </div>
    )
}
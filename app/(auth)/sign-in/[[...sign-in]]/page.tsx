import { SignIn } from '@clerk/nextjs'
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
            <SignIn 
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                afterSignInUrl="/post-auth"
                fallbackRedirectUrl="/post-auth"
            />
        </div>
    )
}
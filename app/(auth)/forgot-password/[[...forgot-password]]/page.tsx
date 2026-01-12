import { TaskResetPassword } from '@clerk/nextjs'

export default function ForgotPasswordPage() {
    return (
        <div className='flex items-center justify-center min-h-screen'>
            <TaskResetPassword redirectUrlComplete="/dashboard" />
        </div>
    )
}


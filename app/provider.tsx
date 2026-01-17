"use client"

import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import React, { useEffect, useRef } from 'react'


function Provider({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {

    const { user, isLoaded, isSignedIn } = useUser();
    const didCreate = useRef(false);

    useEffect(() => {
        if (!isLoaded || !isSignedIn || !user || didCreate.current) return;
        didCreate.current = true;
        createNewUser();
    }, [isLoaded, isSignedIn, user]);

    const createNewUser = async () => {
        try {
            const token = await user?.getToken();
            await axios.post(
                '/api/user',
                undefined,
                token
                    ? {
                          headers: { Authorization: `Bearer ${token}` },
                          withCredentials: true,
                      }
                    : { withCredentials: true },
            );
        } catch {
            // Silently ignore to avoid blocking UI if auth is still warming up.
        }
    }

    return (
        <div>
            {children}
        </div>
    )
}



export default Provider


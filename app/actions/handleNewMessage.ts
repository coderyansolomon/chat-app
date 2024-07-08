'use server'

import { getAccessControl, getAuth } from '@kobbleio/next/server';
import OpenAI from 'openai'
import {v4 as uuidv4} from 'uuid'
import { getSupabaseClient } from '../supabase/client';
import { revalidatePath } from 'next/cache';

interface Message {
    id: string;
    chat_id: string;
    user_id?: string;
    content: string;
    role: 'user' | 'assistant';
    created_at: string;
}

export const handleNewMessage = async (formData: FormData) => {

    console.log('running')

    const openai = new OpenAI({
        apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY
    })

    const newMessage = formData.get('newMessage')
    const chatId = formData.get('chatId')

    if (!newMessage || typeof newMessage !== 'string') return
    if (!chatId || typeof chatId !== 'string') return
    if (newMessage.trim() === '') return

    const userMessage: Message = {
        id: uuidv4(),
        chat_id: chatId,
        content: newMessage,
        role: 'user',
        created_at: new Date().toISOString()
    }

    const {session} = await getAuth();
    const userId = session?.user.id;

    const supabaseClient = getSupabaseClient()

    const {error: userMessageError} = await supabaseClient
        .from('messages')
        .insert([userMessage])

    if (userMessageError){
        console.error('Error sending user message', userMessageError)
        return
    }

    revalidatePath('/')

    const {data: existingMessages, error: fetchMessagesError} = await supabaseClient
        .from('messages')
        .select('role, content')
        .eq('chat_id', chatId)
        .order('created_at', {ascending: true})
        .filter('user_id', 'eq', userId)

    if (fetchMessagesError){
            console.error('Error fetching user message', fetchMessagesError)
            return
        }

    const acl = await getAccessControl();

    const hasPremiumPlanPermission = await acl.hasPermission('premium-plan');

    const model = hasPremiumPlanPermission ? 'gpt-4-turbo' : 'gpt-3.5-turbo'

    try{
        const response = await openai.chat.completions.create({
            model,
            messages: [
                {role: 'system', content: 'You are a helpful assistant.'},
                ...existingMessages,
                {role: 'user', content: newMessage},
            ] as {role: 'system' | 'user' | 'assistant'; content: string}[]
        })

        const botMessage: Message = {
            id: uuidv4(),
            chat_id: chatId,
            content: response.choices[0].message.content || 'No response from bot',
            role: 'assistant',
            created_at: new Date().toISOString()
        }

        const {error: botMessageError} = await supabaseClient
            .from('messages')
            .insert([botMessage])

        if (botMessageError){
                console.error('Error saving bot message', botMessageError)
                return
        }
        revalidatePath('/')
    } catch(error){
        console.error('Error getting openAI response', error)
    }
}
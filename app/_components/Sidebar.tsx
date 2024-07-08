import { LogoutButton, PricingLink } from "@kobbleio/next/client";
import { getAccessControl, getAuth } from "@kobbleio/next/server"
import { getSupabaseClient } from "../supabase/client";
import ChatList from "./ChatList";
import { handleNewChat } from "../actions/handleNewChat";

const Sidebar: React.FC = async () => {
    const {session} = await getAuth()
    const userId = session?.user.id

    const acl = await getAccessControl();

    const hasPremiumPlanPermission = await acl.hasPermission('premium-plan');
    const supabaseClient = getSupabaseClient()

    const {data: chats} = await supabaseClient
        .from('chats')
        .select('id, name')
        .order('created_at', {ascending: false})
        .filter('user_id', 'eq', userId)


    return (
        <div className="w-82 h-full bg-[#1e1e1e] text-[#eaeaea] flex flex-col">
            <div className="p-4 border-b border-[#2e2e2e]">
                <LogoutButton>
                    <button className="mb-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-300">
                        Logout
                    </button>
                </LogoutButton>
                <PricingLink>
                    {
                        hasPremiumPlanPermission ? (
                            <span className="mb-4 ml-2 px-4 py-2 rounded hover:text-red-400 duration-300">Downgrade Model</span>
                        ) : (
                        <span className="mb-4 ml-2 px-4 py-2 rounded hover:text-green-400 duration-300">Upgrade Model</span>
                        )
                    }
                </PricingLink>
                <form action={handleNewChat} className="flex">
                    <input
                        type="text"
                        name="chatName"
                        placeholder="Add new chat name"
                        className="flex-1 p-2 text-black rounded-l bg-[#f5f5f5] placeholder-gray-500 focus:outline-none"
                    />
                    <button
                        type="submit"
                        className="text-sm bg-[#3e3e3e] hover:bg-[#575757] p-2 m-2 text-white"
                    >
                        Add
                    </button>
                </form>
            </div>
            <h1 className="text-xl font-bold p-4">Chat History</h1>
            <ChatList chats={chats || []} />
        </div>
    )

}


export default Sidebar
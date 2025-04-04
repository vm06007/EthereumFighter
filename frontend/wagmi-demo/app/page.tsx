'use client';

import Balance from 'components/Balance';
// import BlockNumber from 'components/BlockNumber';
import Button from 'components/Button';
// import ContractEvent from 'components/ContractEvent';
// import ContractRead from 'components/ContractRead';
// import ContractReads from 'components/ContractReads';
// import EnsAddress from 'components/EnsAddress';
// import EnsAvatar from 'components/EnsAvatar';
import EnsName from 'components/EnsName';
// import EnsResolver from 'components/EnsResolver';
// import FeeData from 'components/FeeData';
// import PublicClient from 'components/PublicClient';
// import SignMessage from 'components/SignMessage';
// import SignTypedData from 'components/SignTypedData';
// import Signer from 'components/Signer';
// import SwitchNetwork from 'components/SwitchNetwork';
// import Token from 'components/Token';
// import Transaction from 'components/Transaction';
// import WaitForTransaction from 'components/WaitForTransaction';
// import WalletClient from 'components/WalletClient';
// import WatchPendingTransactions from 'components/WatchPendingTransactions';
import { shorten } from 'lib/utils';
// import Image from 'next/image';
import { useAccount, useDisconnect } from 'wagmi';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useSetActiveWallet } from '@privy-io/wagmi';
// import wagmiPrivyLogo from '../public/wagmi_privy_logo.png';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useEnsName } from 'wagmi';

const MonoLabel = ({ label }: { label: string }) => {
    return <span className="rounded-xl bg-slate-200 px-2 py-1 font-mono">{label}</span>;
};

export default function Home() {
    // Router
    const router = useRouter();

    // Privy hooks
    const { ready, user, authenticated, login, connectWallet, logout, linkWallet } = usePrivy();
    const { wallets, ready: walletsReady } = useWallets();

    // WAGMI hooks
    const { address, isConnected, isConnecting, isDisconnected } = useAccount();
    const { data: ensName } = useEnsName({ address });
    const { disconnect } = useDisconnect();
    const { setActiveWallet } = useSetActiveWallet();

    // Menu state
    const [currentIndex, setCurrentIndex] = useState(0);
    // const [actionMessage, setActionMessage] = useState('');
    const [isMusicOn, setIsMusicOn] = useState(true);
    // Add state for toggling main content visibility
    const [isMainVisible, setIsMainVisible] = useState(false);

    // Menu items for reference
    const menuItems = [
        'CONNECT WALLET',
        'SPECTATOR MODE',
        'PLAYER 1 VS PLAYER 2',
        'CHARACTER SELECT',
        'SETTINGS'
    ];

    // Set up keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    setCurrentIndex(prevIndex =>
                        (prevIndex - 1 + menuItems.length) % menuItems.length
                    );
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    setCurrentIndex(prevIndex =>
                        (prevIndex + 1) % menuItems.length
                    );
                    break;

                case 'Enter':
                case ' ':
                    e.preventDefault();
                    confirmSelection(currentIndex);
                    break;
            }
        };

        // Add event listener
        window.addEventListener('keydown', handleKeyDown);

        // Remove event listener on cleanup
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [currentIndex]);

    // Toggle main content visibility
    const toggleMainContent = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent the default link behavior
        setIsMainVisible(prev => !prev);
    };

    // Handle menu item selection
    const confirmSelection = (index: number) => {
        const selectedItem = menuItems[index];


        console.log("CONFIRMED:", selectedItem);

        // Set action message based on selection
        switch (index) {
            case 0: // Connect Wallet or Start Game
                if (isConnected) {
                    setTimeout(() => {
                        router.push('/world');
                    }, 500);
                } else {
                    connectWallet();
                }
                break;
            case 1: // Spectator Mode
                // setActionMessage('ENTERING SPECTATOR MODE...');
                // Add actual action here
                break;
            case 2: // Player vs Player
                if (isConnected) {
                    if (wallets.length > 1) {
                        // If two wallets are already connected, go directly to game
                        // setActionMessage('STARTING GAME...');
                        setTimeout(() => {
                            router.push('/world');
                        }, 500);
                    } else {
                        // Only one wallet connected, connect another
                        // setActionMessage('CONNECTING SECOND WALLET...');
                        connectWallet();
                        setTimeout(() => {
                            if (wallets.length > 1) {
                                router.push('/world');
                            }
                        }, 3000);
                    }
                } else {
                    // setActionMessage('STARTING LOCAL MULTIPLAYER...');
                    connectWallet();
                }
                break;
            case 3: // Character Select
                if (isConnected) {
                    // setActionMessage('LOADING CHARACTER SELECT...');
                    setTimeout(() => {
                        router.push('/agents');
                    }, 500);
                } else {
                    // setActionMessage('CONNECT WALLET FIRST');
                    setTimeout(() => {
                        connectWallet();
                    }, 1000);
                }
                break;
            case 4: // Settings
                // setActionMessage('OPENING SETTINGS...');
                // Add actual action here
                break;
        }
    };

    // Set active class handler for menu items
    const getMenuItemClass = (index: number) => {
        return `menu-item ${currentIndex === index ? 'active' : ''}`;
    };

    // Handle mouse hover
    const handleMouseEnter = (index: number) => {
        if (currentIndex !== index) {
            setCurrentIndex(index);
        }
    };

    if (!ready) {
        return null;
    }

    return (
        <>
            <section className="splash-screen load">
                <div className="title">
                    <h1 className="title-top"><span className="big">E</span>thereum</h1>
                    <h1 className="title-bottom"><span className="big">F</span>ighte<span className="big">R</span></h1>
                </div>

                <div className="buttons grey-with-red flex-center" style={{ marginTop: '60px' }}>
                    <a
                        id="menu-connect"
                        className={getMenuItemClass(0)}
                        onClick={() => confirmSelection(0)}
                        onMouseEnter={() => handleMouseEnter(0)}
                    >
                        {isConnected ? 'Join Online' : 'Connect Wallet'}
                    </a>
                    <a
                        id="menu-spectator"
                        className={getMenuItemClass(1)}
                        onClick={() => confirmSelection(1)}
                        onMouseEnter={() => handleMouseEnter(1)}
                    >
                        Spectator Mode
                    </a>
                    <a
                        id="menu-pvp"
                        className={getMenuItemClass(2)}
                        onClick={() => confirmSelection(2)}
                        onMouseEnter={() => handleMouseEnter(2)}
                    >
                        {isConnected ? (
                            <span>
                                {wallets.length > 1 ? (
                                    <>
                                        {address && ensName ? ensName : shorten(address || '')} vs {
                                            (() => {
                                                const secondWallet = wallets.find(wallet => wallet.address !== address);
                                                return secondWallet ? shorten(secondWallet.address) : 'Player 2';
                                            })()
                                        }
                                    </>
                                ) : (
                                    <>{address && ensName ? ensName : shorten(address || '')} vs Player 2</>
                                )}
                            </span>
                        ) : 'Player 1 vs Player 2'}
                    </a>
                    <a
                        id="menu-agents"
                        className={getMenuItemClass(3)}
                        onClick={() => confirmSelection(3)}
                        onMouseEnter={() => handleMouseEnter(3)}
                    >
                        Character Select
                    </a>
                    <a
                        id="menu-settings"
                        className={getMenuItemClass(4)}
                        onClick={() => confirmSelection(4)}
                        onMouseEnter={() => handleMouseEnter(4)}
                    >
                        Settings
                    </a>
                </div>
                <div className="bottom super-bottom">
                    <div className="music grey-with-red">
                        Music <span className="yellow-with-darkyellow">{isMusicOn ? 'ON' : 'OFF'}</span>
                    </div>
                    <a href="#" onClick={toggleMainContent}>
                        <span className="yellow">©</span>
                        <span className="yellow-with-darkyellow"> ETHGLOBAL 2025 TAIPEI</span>
                    </a>
                    <div className="grey-with-red">Credit <span className="yellow-with-darkyellow">1</span></div>
                </div>
            </section>
            <main className={isMainVisible ? "min-h-screen bg-slate-200 p-4 text-slate-800" : "hidden min-h-screen bg-slate-200 p-4 text-slate-800"}>
                <p className="my-4 text-center">
                    This demo showcases how you can integrate{' '}
                    <a href="https://wagmi.sh/" className="font-medium underline">
                        wagmi
                    </a>{' '}
                    alongside{' '}
                    <a href="https://www.privy.io/" className="font-medium underline">
                        Privy
                    </a>{' '}
                    in your React app. Login below to try it out!
                    <br />
                    For more information, check out{' '}
                    <a href="https://docs.privy.io/guide/guides/wagmi" className="font-medium underline">
                        our integration guide
                    </a>{' '}
                    or the{' '}
                    <a href="https://github.com/privy-io/wagmi-demo" className="font-medium underline">
                        source code
                    </a>{' '}
                    for this app.
                </p>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="border-1 flex flex-col items-start gap-2 rounded border border-black bg-slate-100 p-3">
                        <h1 className="text-4xl font-bold">Privy</h1>
                        {ready && !authenticated && (
                            <>
                                <p>You are not authenticated with Privy</p>
                                <div className="flex items-center gap-4">
                                    <Button onClick_={login} cta="Login with Privy" />
                                    <span>or</span>
                                    <Button onClick_={connectWallet} cta="Connect only" />
                                </div>
                            </>
                        )}

                        {walletsReady &&
                            wallets.map((wallet) => {
                                return (
                                    <div
                                        key={wallet.address}
                                        className="flex min-w-full flex-row flex-wrap items-center justify-between gap-2 bg-slate-50 p-4"
                                    >
                                        <div>
                                            <MonoLabel label={shorten(wallet.address)} />
                                        </div>
                                        <Button
                                            cta="Make active"
                                            onClick_={() => {
                                                setActiveWallet(wallet);
                                            }}
                                        />
                                    </div>
                                );
                            })}

                        {ready && authenticated && (
                            <>
                                <p className="mt-2">You are logged in with privy.</p>
                                <Button onClick_={connectWallet} cta="Connect another wallet" />
                                <Button onClick_={linkWallet} cta="Link another wallet" />
                                <textarea
                                    value={JSON.stringify(wallets, null, 2)}
                                    className="mt-2 w-full rounded-md bg-slate-700 p-4 font-mono text-xs text-slate-50 sm:text-sm"
                                    rows={JSON.stringify(wallets, null, 2).split('\n').length}
                                    disabled
                                />
                                <br />
                                <textarea
                                    value={JSON.stringify(user, null, 2)}
                                    className="mt-2 w-full rounded-md bg-slate-700 p-4 font-mono text-xs text-slate-50 sm:text-sm"
                                    rows={JSON.stringify(user, null, 2).split('\n').length}
                                    disabled
                                />
                                <br />
                                <Button onClick_={logout} cta="Logout from Privy" />
                            </>
                        )}
                    </div>
                    <div className="border-1 flex flex-col items-start gap-2 rounded border border-black bg-slate-100 p-3">
                        <h1 className="text-4xl font-bold">WAGMI</h1>
                        <p>
                            Connection status: {isConnecting && <span>🟡 connecting...</span>}
                            {isConnected && <span>🟢 connected.</span>}
                            {isDisconnected && <span> 🔴 disconnected.</span>}
                        </p>
                        {isConnected && address && (
                            <>
                                <h2 className="mt-6 text-2xl">useAccount</h2>
                                <p>
                                    address: <MonoLabel label={address} />
                                </p>

                                <Balance />
                                <EnsName />
                                {/*<Signer />
                                <SignMessage />
                                <SignTypedData />
                                <PublicClient />
                                <EnsAddress />
                                <EnsAvatar />
                                <EnsResolver />
                                <SwitchNetwork />
                                <BlockNumber />*/}
                                {/*<SendTransaction />*/}
                                {/*<ContractRead />
                                <ContractReads />*/}
                                {/*<ContractWrite />*/}
                                {/*<ContractEvent />
                                <FeeData />
                                <Token />
                                <Transaction />
                                <WatchPendingTransactions />
                                <WalletClient />
                                <WaitForTransaction />*/}

                                <h2 className="mt-6 text-2xl">useDisconnect</h2>
                                <Button onClick_={disconnect} cta="Disconnect from WAGMI" />
                            </>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}
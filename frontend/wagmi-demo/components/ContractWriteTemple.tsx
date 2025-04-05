'use client';

import Wrapper from 'components/Wrapper';
import { shorten, type AddressString } from 'lib/utils';
import { useEffect } from 'react';
import { sepolia } from 'viem/chains';
import { useAccount, useWriteContract } from 'wagmi';

import Button from './Button';
import MonoLabel from './MonoLabel';

const ABI = [
    {
        inputs: [
            {
                internalType: 'address',
                name: 'to',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
            },
        ],
        name: 'approve',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
] as const;

const ContractWrite = () => {
    const { chain, address } = useAccount();

    const contractAddress: AddressString = '0x7958b71e50725e769fc1197da8655b84450a7666'; // WagmiConnectorDemo on Sepolia

    const { data, error, isError, isPending, writeContract } = useWriteContract();

    useEffect(() => {
        console.error(error);
    }, [error]);

    if (!chain) {
        return (
            <Wrapper title="useContractWrite">
                <p>Loading...</p>
            </Wrapper>
        );
    }

    if (chain.id !== sepolia.id) {
        return (
            <Wrapper title="useContractWrite">
                <p>Unsupported network. Please switch to Sepolia.</p>
            </Wrapper>
        );
    }

    return (
        <Wrapper title="useContractWrite">
            <div className="rounded bg-red-400 px-2 py-1 text-sm text-white">
                We recommend doing this on sepolia.
            </div>
            {data && !isError && (
                <p>
                    Transaction hash: <MonoLabel label={shorten(data)} />
                </p>
            )}
            {isError && <p>Error sending transaction.</p>}
            {address && (
                <Button
                    cta="Mint"
                    disabled={isPending}
                    onClick_={() => {
                    }}
                />
            )}
        </Wrapper>
    );
};

export default ContractWrite;

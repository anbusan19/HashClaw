import { NextResponse } from "next/server";
import { ethers } from "ethers";

const EXECUTOR_ABI = [
  "event RebalanceQueued(uint256 indexed planId, address indexed user, string reasoning)",
  "event RebalanceExecuted(uint256 indexed planId, address indexed user, uint256 legsExecuted)",
  "event LegExecuted(uint256 indexed planId, uint256 fromAsset, uint256 toAsset, uint256 amount)",
];

const ASSET_SYMBOLS: Record<number, string> = { 0: "xXAG", 1: "xMMF", 2: "veHSK", 3: "USDC-USDT LP" };

export async function GET() {
  const executorAddr = process.env.REBALANCE_EXECUTOR_ADDRESS;
  if (!executorAddr) return NextResponse.json({ logs: [] });

  try {
    const provider = new ethers.JsonRpcProvider(
      process.env.HASHKEY_RPC_URL ?? "https://testnet.hsk.xyz"
    );
    const executor = new ethers.Contract(executorAddr, EXECUTOR_ABI, provider);

    // Determine block range — avoid scanning from genesis (RPC timeout)
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = process.env.EXECUTOR_DEPLOY_BLOCK
      ? Number(process.env.EXECUTOR_DEPLOY_BLOCK)
      : Math.max(0, latestBlock - 50_000);

    // Fetch all three event types in parallel
    const [queuedRaw, executedRaw, legsRaw] = await Promise.all([
      executor.queryFilter(executor.filters.RebalanceQueued(), fromBlock),
      executor.queryFilter(executor.filters.RebalanceExecuted(), fromBlock),
      executor.queryFilter(executor.filters.LegExecuted(), fromBlock),
    ]);

    // Collect unique block numbers, fetch timestamps in parallel
    const blockNums = [
      ...new Set([...queuedRaw, ...executedRaw].map((e) => e.blockNumber)),
    ];
    const blocks = await Promise.all(blockNums.map((n) => provider.getBlock(n)));
    const timestamps: Record<number, number> = {};
    blocks.forEach((b, i) => { if (b) timestamps[blockNums[i]] = b.timestamp; });

    // Build per-plan records
    const plans = queuedRaw.map((ev) => {
      const log = ev as ethers.EventLog;
      const planId = Number(log.args.planId);

      const legs = (legsRaw as ethers.EventLog[])
        .filter((l) => Number(l.args.planId) === planId)
        .map((l) => ({
          fromAssetId:   Number(l.args.fromAsset),
          toAssetId:     Number(l.args.toAsset),
          fromSymbol:    ASSET_SYMBOLS[Number(l.args.fromAsset)] ?? `Asset ${l.args.fromAsset}`,
          toSymbol:      ASSET_SYMBOLS[Number(l.args.toAsset)]   ?? `Asset ${l.args.toAsset}`,
          amount:        ethers.formatEther(l.args.amount),
          txHash:        l.transactionHash,
        }));

      const execEv = (executedRaw as ethers.EventLog[]).find(
        (e) => Number(e.args.planId) === planId
      );

      return {
        planId,
        user:         log.args.user as string,
        reasoning:    log.args.reasoning as string,
        txHash:       log.transactionHash,
        blockNumber:  log.blockNumber,
        timestamp:    timestamps[log.blockNumber] ?? null,
        legsExecuted: execEv ? Number(execEv.args.legsExecuted) : legs.length,
        legs,
      };
    });

    // Most recent first
    plans.sort((a, b) => b.blockNumber - a.blockNumber);

    return NextResponse.json({ logs: plans, explorerUrl: "https://testnet-explorer.hsk.xyz" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, logs: [] }, { status: 500 });
  }
}

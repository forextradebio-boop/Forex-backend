const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    try {
        const DepositModel = mongoose.model('Deposit', new mongoose.Schema({
            userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
            amount: { type: Number, required: true },
            currency: { type: String, required: true, default: 'USD' },
            paymentMethod: { type: String, enum: ['UPI', 'NETBANKING'], required: true, default: 'UPI' },
            utr: { type: String, required: true },
            screenshot: { type: String },
            status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'BLOCKED'], default: 'PENDING' },
            adminNote: { type: String },
            remarks: { type: String },
            approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            approvedAt: { type: Date },
        }));

        const WalletModel = mongoose.model('Wallet', new mongoose.Schema({
            userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
            balance: { type: Number, default: 0 },
            equity: { type: Number, default: 0 },
            margin: { type: Number, default: 0 },
            freeMargin: { type: Number, default: 0 },
            pnl: { type: Number, default: 0 },
            status: { type: String, enum: ['ACTIVE', 'FROZEN'], default: 'ACTIVE' },
        }));

        const TransactionModel = mongoose.model('Transaction', new mongoose.Schema({
            userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
            type: { type: String, enum: ['DEPOSIT', 'WITHDRAW', 'TRADE', 'BONUS', 'TRADE_LOSS', 'ADMIN_ADJUSTMENT', 'WITHDRAWAL'], required: true },
            amount: { type: Number, required: true },
            balanceAfter: { type: Number },
            status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
            referenceId: { type: String },
            description: { type: String },
        }));

        const id = '6a59ca7439367de738ece3f7';
        const deposit = await DepositModel.findById(id);
        console.log("Deposit found:", deposit);

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            deposit.status = 'APPROVED';
            deposit.approvedAt = new Date();
            await deposit.save({ session });
            console.log("Deposit saved");
            
            const wallet = await WalletModel.findOne({ userId: deposit.userId }).session(session);
            if (wallet) {
                wallet.balance += deposit.amount;
                wallet.equity = wallet.balance + (wallet.pnl || 0);
                wallet.freeMargin = wallet.equity - (wallet.margin || 0);
                await wallet.save({ session });
                console.log("Wallet saved");
            }
            
            await TransactionModel.create([{
                userId: deposit.userId,
                type: 'DEPOSIT',
                amount: deposit.amount,
                balanceAfter: 100,
                status: 'APPROVED',
                referenceId: deposit._id.toString(),
                description: `Deposit Approved by Admin`
            }], { session });
            console.log("Transaction created");

            const AuditLogModel = mongoose.model('AuditLog', new mongoose.Schema({
                adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                action: { type: String, required: true },
                details: { type: mongoose.Schema.Types.Mixed },
                ipAddress: { type: String }
            }));

            const NotificationModel = mongoose.model('Notification', new mongoose.Schema({
                userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
                title: { type: String, required: true },
                message: { type: String, required: true },
                type: { type: String, required: true },
                read: { type: Boolean, default: false }
            }));

            await AuditLogModel.create([{ adminId: deposit.userId, action: 'APPROVE_DEPOSIT', details: { depositId: id, remarks: 'test' } }], { session });
            console.log("AuditLog created");

            await NotificationModel.create([{ userId: deposit.userId, title: 'Deposit Approved', message: `test`, type: 'SUCCESS' }], { session });
            console.log("Notification created");

            await session.commitTransaction();
            console.log("Transaction committed!");
        } catch(e) {
            console.log("Transaction aborted due to error:", e);
            await session.abortTransaction();
        } finally {
            session.endSession();
        }
    } catch(e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}
test();

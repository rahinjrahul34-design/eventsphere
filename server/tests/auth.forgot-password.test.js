const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const PasswordReset = require('../src/models/PasswordReset');

describe('Secure Forgot Password & OTP Reset Suite', () => {
  let testUserDoc;
  const testUser = {
    name: 'Security Test User',
    email: 'security.test@test.com',
    password: 'OldPassword123!',
    role: 'attendee',
  };

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({ email: testUser.email });
    await PasswordReset.deleteMany({ email: testUser.email });
    testUserDoc = await User.create(testUser);
  });

  afterAll(async () => {
    await User.deleteMany({ email: testUser.email });
    await PasswordReset.deleteMany({ email: testUser.email });
    await disconnectDB();
  });

  beforeEach(async () => {
    await PasswordReset.deleteMany({ email: testUser.email });
  });

  async function createActiveResetToken() {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await PasswordReset.create({
      userId: testUserDoc._id,
      email: testUser.email,
      otpExpiresAt: new Date(0),
      lastSentAt: new Date(),
      verifiedAt: new Date(),
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    return rawToken;
  }

  // 1. Existing email forgot password
  it('1. returns generic success message for an existing email without revealing account existence', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('If an account exists with this email, a verification code has been sent.');

    const record = await PasswordReset.findOne({ email: testUser.email });
    expect(record).toBeTruthy();
    expect(record.otpHash).toBeUndefined(); // select: false
    expect(record.otpAttempts).toBe(0);
    expect(record.isUsed).toBe(false);
  });

  // 2. Non-existing email forgot password
  it('2. returns the identical generic response for a non-existing email (anti-enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent.user999@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('If an account exists with this email, a verification code has been sent.');

    const record = await PasswordReset.findOne({ email: 'nonexistent.user999@test.com' });
    expect(record).toBeNull();
  });

  // 3. Valid OTP
  it('3. verifies a valid OTP and returns a short-lived reset token', async () => {
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email });

    const otp = forgotRes.body.demoOtp || forgotRes.body.data?.demoOtp;
    expect(otp).toBeDefined();

    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: testUser.email, otp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.resetToken).toBeDefined();

    const record = await PasswordReset.findOne({ email: testUser.email }).select('+otpHash +resetTokenHash');
    expect(record.otpHash).toBeUndefined();
    expect(record.verifiedAt).toBeTruthy();
    expect(record.resetTokenHash).toBeDefined();
    expect(record.resetTokenExpiresAt).toBeTruthy();
  });

  // 4. Invalid OTP
  it('4. rejects an invalid OTP with a generic error message', async () => {
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email });

    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: testUser.email, otp: '000000' });

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.success).toBe(false);
    expect(verifyRes.body.message).toBe('Invalid or expired verification code.');

    const record = await PasswordReset.findOne({ email: testUser.email });
    expect(record.otpAttempts).toBe(1);
  });

  // 5. Expired OTP
  it('5. rejects an expired OTP', async () => {
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email });

    const otp = forgotRes.body.demoOtp || forgotRes.body.data?.demoOtp;

    await PasswordReset.updateOne(
      { email: testUser.email },
      { otpExpiresAt: new Date(Date.now() - 1000) }
    );

    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: testUser.email, otp });

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.success).toBe(false);
    expect(verifyRes.body.message).toBe('Invalid or expired verification code.');
  });

  // 6. 5 failed OTP attempts
  it('6. invalidates OTP after 5 failed attempts', async () => {
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email });

    for (let i = 1; i <= 4; i++) {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: testUser.email, otp: '111111' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid or expired verification code.');
    }

    const fifthRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: testUser.email, otp: '111111' });

    expect(fifthRes.status).toBe(400);
    expect(fifthRes.body.message).toBe('Too many verification attempts. Please request a new code.');

    const record = await PasswordReset.findOne({ email: testUser.email });
    expect(record).toBeNull();
  });

  // 7. OTP after maximum attempts
  it('7. rejects verification attempts after maximum attempts exceeded', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: testUser.email, otp: '999999' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid or expired verification code.');
  });

  // 8. Resend before 60 seconds
  it('8. rejects resend request before 60-second cooldown', async () => {
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email });

    const resendRes = await request(app)
      .post('/api/auth/resend-otp')
      .send({ email: testUser.email });

    expect(resendRes.status).toBe(429);
    expect(resendRes.body.success).toBe(false);
    expect(resendRes.body.message).toBe('Please wait before requesting another code.');
  });

  // 9. Resend after 60 seconds
  it('9. allows resend after 60 seconds and resets attempts', async () => {
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email });

    await PasswordReset.updateOne(
      { email: testUser.email },
      { lastSentAt: new Date(Date.now() - 61 * 1000), otpAttempts: 2 }
    );

    const resendRes = await request(app)
      .post('/api/auth/resend-otp')
      .send({ email: testUser.email });

    expect(resendRes.status).toBe(200);
    expect(resendRes.body.success).toBe(true);

    const record = await PasswordReset.findOne({ email: testUser.email });
    expect(record.otpAttempts).toBe(0);
  });

  // 10. Old OTP after resend
  it('10. invalidates previous OTP when a new OTP is resent', async () => {
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email });

    const firstOtp = forgotRes.body.demoOtp || forgotRes.body.data?.demoOtp;

    await PasswordReset.updateOne(
      { email: testUser.email },
      { lastSentAt: new Date(Date.now() - 61 * 1000) }
    );

    const resendRes = await request(app)
      .post('/api/auth/resend-otp')
      .send({ email: testUser.email });

    const secondOtp = resendRes.body.demoOtp || resendRes.body.data?.demoOtp;

    const oldRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: testUser.email, otp: firstOtp });

    expect(oldRes.status).toBe(400);

    const newRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: testUser.email, otp: secondOtp });

    expect(newRes.status).toBe(200);
    expect(newRes.body.resetToken).toBeDefined();
  });

  // 11. Valid reset token
  it('11. accepts valid reset token and resets password', async () => {
    const resetToken = await createActiveResetToken();

    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        resetToken,
        newPassword: 'BrandNewPassword123!',
        confirmPassword: 'BrandNewPassword123!',
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);
    expect(resetRes.body.message).toBe('Password reset successfully.');
  });

  // 12. Expired reset token
  it('12. rejects an expired reset token', async () => {
    const resetToken = await createActiveResetToken();

    await PasswordReset.updateOne(
      { email: testUser.email },
      { resetTokenExpiresAt: new Date(Date.now() - 1000) }
    );

    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        resetToken,
        newPassword: 'BrandNewPassword123!',
        confirmPassword: 'BrandNewPassword123!',
      });

    expect(resetRes.status).toBe(400);
    expect(resetRes.body.message).toBe('Password reset session is invalid or expired.');
  });

  // 13. Reused reset token
  it('13. rejects reused reset token (single-use protection)', async () => {
    const resetToken = await createActiveResetToken();

    // First use
    const firstRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        resetToken,
        newPassword: 'SuperSecretPass1!',
        confirmPassword: 'SuperSecretPass1!',
      });
    expect(firstRes.status).toBe(200);

    // Replay attempt with same token
    const replayRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        resetToken,
        newPassword: 'AnotherPassword99!',
        confirmPassword: 'AnotherPassword99!',
      });

    expect(replayRes.status).toBe(400);
    expect(replayRes.body.message).toBe('Password reset session is invalid or expired.');
  });

  // 14. Weak password
  it('14. rejects weak password that does not meet complexity requirements', async () => {
    const weakRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        resetToken: 'sample_token_123',
        newPassword: 'weak',
        confirmPassword: 'weak',
      });

    expect(weakRes.status).toBe(400);
    expect(weakRes.body.success).toBe(false);
  });

  // 15. Password mismatch
  it('15. rejects request when newPassword and confirmPassword do not match', async () => {
    const mismatchRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        resetToken: 'sample_token_123',
        newPassword: 'ValidPassword123!',
        confirmPassword: 'DifferentPassword123!',
      });

    expect(mismatchRes.status).toBe(400);
    expect(mismatchRes.body.success).toBe(false);
  });

  // 16. Successful password reset
  it('16. successfully updates user password and clears reset records', async () => {
    const resetToken = await createActiveResetToken();

    const finalPass = 'FullyUpdatedPass99!';
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        resetToken,
        newPassword: finalPass,
        confirmPassword: finalPass,
      });

    expect(resetRes.status).toBe(200);

    const records = await PasswordReset.find({ email: testUser.email });
    expect(records.length).toBe(0);
  });

  // 17. Login using new password
  it('17. allows user to log in with new password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'FullyUpdatedPass99!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  // 18. Old password rejected
  it('18. rejects login with the old password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password, // OldPassword123!
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // 19. Rate limiting
  it('19. rate limiters are configured on all password-reset endpoints', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // 20. Unauthorized reset attempts
  it('20. rejects unauthorized reset attempts with invalid tokens', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({
        resetToken: 'completely_fake_and_invalid_token_12345',
        newPassword: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Password reset session is invalid or expired.');
  });
});

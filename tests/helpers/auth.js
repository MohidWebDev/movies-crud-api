import User from "../../models/userModel.js";
import generateToken from "../../utils/generateToken.js";

let counter = 0;

export const createUserWithToken = async (role = "user", overrides = {}) => {
  counter += 1;
  const user = await User.create({
    name: `Test ${role}`,
    email: `${role}${counter}@example.com`,
    password: "password123",
    role,
    ...overrides,
  });

  const token = generateToken(user._id, user.role);
  return { user, token };
};

export const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

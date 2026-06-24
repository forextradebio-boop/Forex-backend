import { Request, Response } from 'express';
import { UserModel } from '../models/User';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    res.status(200).json({
      _id: user._id,
      name: user.fullName,
      email: user.email,
      phone: user.phone || "",
      country: user.country || "",
      avatar: user.avatar || "",
      createdAt: user.createdAt
    });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { name, phone, country, avatar } = req.body;

    // Validate types if they exist
    if (name && typeof name !== 'string') {
      res.status(400).json({ message: 'Validation Error: name must be string' });
      return;
    }
    if (phone && typeof phone !== 'string') {
      res.status(400).json({ message: 'Validation Error: phone must be string' });
      return;
    }
    if (country && typeof country !== 'string') {
      res.status(400).json({ message: 'Validation Error: country must be string' });
      return;
    }
    if (avatar && typeof avatar !== 'string') {
      res.status(400).json({ message: 'Validation Error: avatar must be string' });
      return;
    }

    const updateFields: any = {};
    if (name) updateFields.fullName = name;
    if (phone !== undefined) updateFields.phone = phone;
    if (country !== undefined) updateFields.country = country;
    if (avatar !== undefined) updateFields.avatar = avatar;

    const updatedUser = await UserModel.findByIdAndUpdate(
      user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      res.status(404).json({ message: 'User Not Found' });
      return;
    }

    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.fullName,
      email: updatedUser.email,
      phone: updatedUser.phone || "",
      country: updatedUser.country || "",
      avatar: updatedUser.avatar || "",
      createdAt: updatedUser.createdAt
    });

  } catch (error: any) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

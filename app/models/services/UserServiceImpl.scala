package models.services

import javax.inject.Inject

import com.mohiva.play.silhouette.api.LoginInfo
import models.User
import models.daos.UserDAO

import scala.concurrent.Future

/**
 * Handles actions to users.
 *
 * @param userDAO The user DAO implementation.
 */
class UserServiceImpl @Inject() (userDAO: UserDAO) extends UserService {

  /**
   * Retrieves a user that matches the specified login info.
   *
   * @param loginInfo The login info to retrieve a user.
   * @return The retrieved user or None if no user could be retrieved for the given login info.
   */
  def retrieve(loginInfo: LoginInfo): Future[Option[User]] = userDAO.find(loginInfo)

  /**
   * Saves a user.
   *
   * @param user The user to save.
   * @return The saved user.
   */
  def create(user: User) = userDAO.create(user)

  /**
   * Finds user by email.
   *
   * @param email
   * @return The user associated with the email.
   */
  def find(email: String) = userDAO.find(email)

  /**
   * Updates a user.
   *
   * @param user
   * @return
   */
  def update(user: User) = userDAO.update(user)

  /**
   * Deletes the user of the specified ID.
   *
   * @param email The ID of the user to delete.
   * @return
   */
  def delete(email: String) = userDAO.delete(email)
}